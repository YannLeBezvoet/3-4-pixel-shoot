// MatchHost runs one match (ARCHITECTURE §6): the simulation, the game mode, the participants
// and (from task 16) the bots. The same code runs in a browser tab for solo and in a server
// room online; the caller provides the clock by calling `step` 60 times per second.
import { createRng } from '@pixel-shoot/shared';
import type {
  ActorState,
  Catalog,
  DisplayText,
  EntityId,
  GameModeDefinition,
  GameModeInstance,
  InputCommand,
  MapData,
  ModeApi,
  ModeState,
  ParticipantId,
  ParticipantInfo,
  ProjectileState,
  SimEvent,
  Simulation,
} from '@pixel-shoot/sim';
import { TILE_SIZE, createSimulation } from '@pixel-shoot/sim';

export interface ParticipantSetup {
  readonly name: DisplayText;
  readonly team: number;
  /** Character id in the catalog. */
  readonly character: string;
  readonly kind: 'human' | 'bot';
}

export interface MatchSetup<Settings = unknown> {
  readonly map: MapData;
  readonly catalog: Catalog;
  readonly mode: GameModeDefinition<Settings>;
  /** Mode settings as given by a player; validated by the mode, defaults applied. */
  readonly settings?: unknown;
  readonly seed: number | string;
}

export interface ParticipantView extends ParticipantInfo {
  /** Current character, alive or dead. */
  readonly entity: EntityId | undefined;
  /** Enemies killed. */
  readonly kills: number;
  readonly deaths: number;
}

/** Everything presentation needs to draw one tick. */
export interface WorldView {
  readonly tick: number;
  readonly actors: readonly ActorState[];
  readonly projectiles: readonly ProjectileState[];
  readonly participants: readonly ParticipantView[];
  readonly mode: ModeState;
}

export interface MatchHost {
  readonly map: MapData;
  readonly tick: number;
  /** True once the mode has declared a result. */
  readonly finished: boolean;
  addParticipant(setup: ParticipantSetup): ParticipantId;
  removeParticipant(id: ParticipantId): void;
  /** Starts the game mode; participants added before are already known to it. */
  start(): void;
  /** The input a human participant holds from now on, until replaced. */
  submitInput(participant: ParticipantId, input: InputCommand): void;
  /** Advances one tick and returns its simulation events. */
  step(): readonly SimEvent[];
  view(): WorldView;
}

interface Participant extends ParticipantInfo {
  entity: EntityId | undefined;
  input: InputCommand | undefined;
  kills: number;
  deaths: number;
}

export function createMatchHost<Settings>(setup: MatchSetup<Settings>): MatchHost {
  const settings = setup.mode.settings.parse(setup.settings ?? {});
  const sim: Simulation = createSimulation({
    map: setup.map,
    catalog: setup.catalog,
    seed: setup.seed,
    rules: setup.mode.rules(settings),
  });
  const root = createRng(setup.seed);
  const spawnRandom = root.fork('spawns');
  const participants = new Map<ParticipantId, Participant>();
  const byEntity = new Map<EntityId, Participant>();
  let nextParticipant = 1;
  let started = false;

  const api: ModeApi = {
    map: setup.map,
    get tick() {
      return sim.tick;
    },
    participants: () => [...participants.values()].map(info),
    characterOf: (id) => {
      const entity = participants.get(id)?.entity;
      return entity === undefined ? undefined : sim.actor(entity);
    },
    spawn(id) {
      const participant = participants.get(id);
      if (!participant) return undefined;
      if (participant.entity !== undefined) {
        sim.removeActor(participant.entity);
        byEntity.delete(participant.entity);
        participant.entity = undefined;
      }
      const stats = setup.catalog.characters.get(participant.character);
      if (!stats) throw new Error(`Unknown character "${participant.character}".`);
      const spots = sim.freeSpawnSpots(participant.team, stats.radius);
      if (spots.length === 0) return undefined;
      const spot = spawnRandom.pick(spots);
      // Face the middle of the map.
      const aim = Math.atan2(
        (setup.map.height * TILE_SIZE) / 2 - spot.y,
        (setup.map.width * TILE_SIZE) / 2 - spot.x,
      );
      const entity = sim.spawnActor({ team: participant.team, character: stats.id, ...spot, aim });
      participant.entity = entity;
      byEntity.set(entity, participant);
      return entity;
    },
    clearWorld() {
      sim.clear();
      byEntity.clear();
      for (const participant of participants.values()) participant.entity = undefined;
    },
    setFrozen(frozen) {
      sim.frozen = frozen;
    },
    random: root.fork('mode'),
  };
  const mode: GameModeInstance = setup.mode.create(api, settings);

  function info(p: Participant): ParticipantInfo {
    return { id: p.id, name: p.name, team: p.team, kind: p.kind, character: p.character };
  }

  return {
    map: setup.map,
    get tick() {
      return sim.tick;
    },
    get finished() {
      return mode.state().result !== undefined;
    },

    addParticipant(participantSetup) {
      if (!setup.catalog.characters.has(participantSetup.character))
        throw new Error(`Unknown character "${participantSetup.character}".`);
      const id = nextParticipant++;
      participants.set(id, {
        ...participantSetup,
        id,
        entity: undefined,
        input: undefined,
        kills: 0,
        deaths: 0,
      });
      if (started) mode.onParticipantJoined(id);
      return id;
    },

    removeParticipant(id) {
      const participant = participants.get(id);
      if (!participant) return;
      if (participant.entity !== undefined) {
        sim.removeActor(participant.entity);
        byEntity.delete(participant.entity);
      }
      participants.delete(id);
      if (started) mode.onParticipantLeft(id);
    },

    start() {
      if (started) return;
      started = true;
      mode.onMatchStart();
    },

    submitInput(id, input) {
      const participant = participants.get(id);
      if (participant) participant.input = input;
    },

    step() {
      const inputs = new Map<EntityId, InputCommand>();
      for (const participant of participants.values())
        if (participant.entity !== undefined && participant.input)
          inputs.set(participant.entity, participant.input);
      const events = sim.step(inputs);
      for (const event of events) {
        if (event.type !== 'killed') continue;
        const victim = byEntity.get(event.victim);
        const killer = byEntity.get(event.killer);
        if (victim) victim.deaths++;
        if (killer && victim && killer.team !== victim.team) killer.kills++;
      }
      for (const event of events) mode.onEvent(event);
      mode.onTick();
      return events;
    },

    view() {
      return {
        tick: sim.tick,
        actors: sim.actors(),
        projectiles: sim.projectiles(),
        participants: [...participants.values()].map((p) => ({
          ...info(p),
          entity: p.entity,
          kills: p.kills,
          deaths: p.deaths,
        })),
        mode: mode.state(),
      };
    },
  };
}
