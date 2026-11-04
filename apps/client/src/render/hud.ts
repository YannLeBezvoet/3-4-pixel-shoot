// The in-match HUD (decision 0004, Q58), drawn at internal resolution with the HUD bitmap font:
// health bottom left, ammunition, weapon and throwables bottom right, score, round, timer and
// survivors top center,
// the kill feed top right, banners in the middle, names and health bars above teammates (Q26),
// and the crosshair. Every text comes from translation keys.
import type { WorldView } from '@pixel-shoot/match';
import type { DisplayText, EntityId, ParticipantId, SimEvent } from '@pixel-shoot/sim';
import { TICK_RATE } from '@pixel-shoot/sim';
import { Container, Graphics } from 'pixi.js';
import type { PixelFont } from './pixel-text';
import { HUD_COLORS, PixelText } from './pixel-text';
import { INTERNAL_HEIGHT, INTERNAL_WIDTH } from './screen-layout';

const MARGIN = 8;
const FEED_LINES = 5;
const FEED_MS = 5000;
/** Height above a character's ground point where its teammate label sits. */
const LABEL_HEIGHT = 50;

export interface HudTexts {
  /** An interface text. */
  t(key: string, params?: Readonly<Record<string, string | number>>): string;
  /** A text from the match: a parameter named `team` becomes that team's faction name. */
  display(text: DisplayText): string;
  teamName(team: number): string;
  weaponName(weapon: string): string;
}

export interface HudFrame {
  readonly view: WorldView;
  readonly local: ParticipantId;
  /** The character the camera follows: the player's own, or a teammate while spectating. */
  readonly followed: EntityId | undefined;
  /** Events of the ticks run since the last frame. */
  readonly events: readonly SimEvent[];
  readonly pointer: { readonly x: number; readonly y: number };
  readonly toScreen: (x: number, y: number) => { x: number; y: number };
  readonly texts: HudTexts;
  readonly deltaMs: number;
  /** False while a menu is open over the match. */
  readonly crosshair: boolean;
}

function clock(ticks: number): string {
  const seconds = Math.ceil(ticks / TICK_RATE);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function bar(
  graphics: Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  ratio: number,
  color: number,
) {
  graphics.rect(x - 1, y - 1, width + 2, height + 2).fill(HUD_COLORS.shadow);
  graphics.rect(x, y, width, height).fill(HUD_COLORS.panel);
  const filled = Math.round(width * Math.max(0, Math.min(1, ratio)));
  if (filled > 0) graphics.rect(x, y, filled, height).fill(color);
}

export class Hud {
  readonly root = new Container();
  readonly #font: PixelFont;
  readonly #bars = new Graphics();
  readonly #health: PixelText;
  readonly #ammo: PixelText;
  readonly #weapon: PixelText;
  readonly #throwables: PixelText;
  readonly #score: PixelText;
  readonly #round: PixelText;
  readonly #survivors: PixelText;
  readonly #banner: PixelText;
  readonly #spectating: PixelText;
  readonly #feed: { text: PixelText; ageMs: number }[] = [];
  readonly #labels = new Container();
  readonly #labelTexts = new Map<EntityId, PixelText>();
  readonly #crosshair = new Graphics();

  constructor(font: PixelFont) {
    this.#font = font;
    const text = (anchorX = 0, color: number = HUD_COLORS.text) =>
      new PixelText(font, { anchorX, color });
    this.#health = text();
    this.#ammo = text(1);
    this.#weapon = text(1, HUD_COLORS.muted);
    this.#throwables = text(1, HUD_COLORS.muted);
    this.#score = text(0.5);
    this.#round = text(0.5, HUD_COLORS.muted);
    this.#survivors = text(0.5, HUD_COLORS.muted);
    this.#banner = text(0.5, HUD_COLORS.accent);
    this.#banner.scale.set(2);
    this.#spectating = text(0.5, HUD_COLORS.muted);

    this.#health.position.set(MARGIN, INTERNAL_HEIGHT - MARGIN - 8);
    this.#ammo.position.set(INTERNAL_WIDTH - MARGIN, INTERNAL_HEIGHT - MARGIN - 8);
    this.#weapon.position.set(INTERNAL_WIDTH - MARGIN, INTERNAL_HEIGHT - MARGIN - 20);
    this.#throwables.position.set(INTERNAL_WIDTH - MARGIN, INTERNAL_HEIGHT - MARGIN - 32);
    this.#score.position.set(INTERNAL_WIDTH / 2, MARGIN);
    this.#round.position.set(INTERNAL_WIDTH / 2, MARGIN + 12);
    this.#survivors.position.set(INTERNAL_WIDTH / 2, MARGIN + 24);
    this.#banner.position.set(INTERNAL_WIDTH / 2, 150);
    this.#spectating.position.set(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT - MARGIN - 32);

    // Crosshair: a cross with a hollow center, white with a dark outline.
    for (const [color, grow] of [
      [HUD_COLORS.shadow, 1],
      [HUD_COLORS.text, 0],
    ] as const) {
      for (const [x, y, w, h] of [
        [-6, 0, 4, 1],
        [3, 0, 4, 1],
        [0, -6, 1, 4],
        [0, 3, 1, 4],
      ] as const)
        this.#crosshair.rect(x - grow, y - grow, w + 2 * grow, h + 2 * grow).fill(color);
    }

    this.root.addChild(
      this.#labels,
      this.#bars,
      this.#health,
      this.#ammo,
      this.#weapon,
      this.#throwables,
      this.#score,
      this.#round,
      this.#survivors,
      this.#banner,
      this.#spectating,
      this.#crosshair,
    );
  }

  update(frame: HudFrame): void {
    const { view, texts } = frame;
    const me = view.participants.find((p) => p.id === frame.local);
    const mine = view.actors.find((a) => a.id === me?.entity);
    this.#bars.clear();

    // Health and ammunition of the player's own character (hidden once dead).
    const alive = mine?.alive === true;
    this.#health.visible = alive;
    this.#ammo.visible = alive;
    this.#weapon.visible = alive;
    this.#throwables.visible = alive && mine?.throwable !== undefined;
    if (mine && alive) {
      this.#health.text = String(mine.hp);
      bar(
        this.#bars,
        MARGIN + 32,
        INTERNAL_HEIGHT - MARGIN - 7,
        80,
        6,
        mine.hp / mine.maxHp,
        mine.hp > mine.maxHp / 3 ? HUD_COLORS.health : HUD_COLORS.danger,
      );
      this.#ammo.text =
        mine.reloadLeft > 0
          ? texts.t('hud.reloading')
          : mine.fuel !== undefined
            ? texts.t('hud.fuel', { percent: Math.ceil(mine.fuel * 100) })
            : mine.spareMagazines === null
              ? String(mine.rounds)
              : texts.t('hud.ammoReserve', { rounds: mine.rounds, spare: mine.spareMagazines });
      this.#weapon.text = texts.weaponName(mine.weapon);
      if (mine.throwable !== undefined) {
        this.#throwables.text = texts.t('hud.throwables', {
          name: texts.weaponName(mine.throwable),
          count: mine.throwables,
        });
        this.#throwables.color = mine.throwables > 0 ? HUD_COLORS.muted : HUD_COLORS.danger;
      }
      this.#ammo.color =
        mine.reloadLeft > 0 || mine.rounds === 0 ? HUD_COLORS.accent : HUD_COLORS.text;
    }

    // Mode state: score, round, timer, survivors per team.
    const mode = view.mode;
    const scores = mode.teamScores;
    this.#score.text = scores
      ? texts.t('hud.score', {
          team1: texts.teamName(1),
          team2: texts.teamName(2),
          score1: scores[0] ?? 0,
          score2: scores[1] ?? 0,
        })
      : '';
    const round = mode.round === undefined ? '' : texts.t('hud.round', { round: mode.round });
    const time = mode.timeLeft === undefined ? '' : clock(mode.timeLeft);
    this.#round.text = [round, time].filter(Boolean).join(' · ');
    if (scores) {
      const standing = (team: number) =>
        view.actors.filter((a) => a.alive && a.team === team).length;
      this.#survivors.text = texts.t('hud.survivors', { team1: standing(1), team2: standing(2) });
    } else this.#survivors.text = '';
    this.#banner.text = mode.banner ? texts.display(mode.banner) : '';

    // Spectating a teammate after death (Q21).
    const followed = view.actors.find((a) => a.id === frame.followed);
    const watched =
      followed && followed.id !== me?.entity
        ? view.participants.find((p) => p.entity === followed.id)
        : undefined;
    this.#spectating.text = watched
      ? texts.t('hud.spectating', { name: texts.display(watched.name) })
      : '';

    this.#updateFeed(frame);
    this.#updateLabels(frame, me?.team);
    this.#crosshair.position.set(Math.round(frame.pointer.x), Math.round(frame.pointer.y));
    this.#crosshair.visible = alive && frame.crosshair;
  }

  /** Kill feed: killer, weapon, victim; the lines about the player are highlighted. */
  #updateFeed(frame: HudFrame): void {
    const { view, texts } = frame;
    const byEntity = (entity: EntityId) => view.participants.find((p) => p.entity === entity);
    for (const event of frame.events) {
      if (event.type !== 'killed') continue;
      const killer = byEntity(event.killer);
      const victim = byEntity(event.victim);
      if (!victim) continue;
      const line = new PixelText(this.#font, { anchorX: 1 });
      line.text = texts.t('hud.kill', {
        killer: killer ? texts.display(killer.name) : '?',
        weapon: texts.weaponName(event.weapon),
        victim: texts.display(victim.name),
      });
      if (killer?.id === frame.local || victim.id === frame.local) line.color = HUD_COLORS.accent;
      this.#feed.unshift({ text: line, ageMs: 0 });
      this.root.addChild(line);
    }
    for (let i = this.#feed.length - 1; i >= 0; i--) {
      const entry = this.#feed[i]!;
      entry.ageMs += frame.deltaMs;
      if (entry.ageMs <= FEED_MS && i < FEED_LINES) continue;
      entry.text.destroy();
      this.#feed.splice(i, 1);
    }
    this.#feed.forEach((entry, i) =>
      entry.text.position.set(INTERNAL_WIDTH - MARGIN, MARGIN + i * 12),
    );
  }

  /** Names and health bars above living teammates (Q26). */
  #updateLabels(frame: HudFrame, team: number | undefined): void {
    const { view } = frame;
    const shown = new Set<EntityId>();
    for (const participant of view.participants) {
      if (participant.id === frame.local || participant.team !== team) continue;
      const actor = view.actors.find((a) => a.id === participant.entity && a.alive);
      if (!actor) continue;
      shown.add(actor.id);
      let label = this.#labelTexts.get(actor.id);
      if (!label) {
        label = new PixelText(this.#font, { anchorX: 0.5, color: HUD_COLORS.muted });
        this.#labelTexts.set(actor.id, label);
        this.#labels.addChild(label);
      }
      label.text = frame.texts.display(participant.name);
      const at = frame.toScreen(actor.x, actor.y - LABEL_HEIGHT);
      label.position.set(Math.round(at.x), Math.round(at.y) - 8);
      bar(
        this.#bars,
        Math.round(at.x) - 10,
        Math.round(at.y) + 2,
        20,
        2,
        actor.hp / actor.maxHp,
        HUD_COLORS.health,
      );
    }
    for (const [id, label] of this.#labelTexts)
      if (!shown.has(id)) {
        label.destroy();
        this.#labelTexts.delete(id);
      }
  }
}
