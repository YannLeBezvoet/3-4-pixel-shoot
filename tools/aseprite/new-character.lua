-- Pixel Shoot: creates a new character sprite with the project conventions
-- (docs/guides/create-a-sprite.md): 48×48 frames, the Resurrect 64 palette, one tag per
-- action and drawn direction, and a "hand" slice for the weapon.
-- Run it from Aseprite: File › Scripts › Open Scripts Folder, copy this file there (or a
-- link to it), then File › Scripts › new-character.

local DIRECTIONS = { "down", "down-side", "side", "up-side", "up" }
local ACTIONS = {
  { name = "idle", frames = 2, ms = 400 },
  { name = "walk", frames = 4, ms = 120 },
  { name = "death", frames = 4, ms = 140, once = true },
}

local function scriptFolder()
  local source = debug.getinfo(1, "S").source
  if source:sub(1, 1) == "@" then source = source:sub(2) end
  return app.fs.filePath(source)
end

local dialog = Dialog("New Pixel Shoot character")
dialog:entry { id = "palette", label = "Palette file",
  text = app.fs.normalizePath(app.fs.joinPath(scriptFolder(), "..", "..", "palette", "resurrect-64.gpl")) }
dialog:file { id = "file", label = "Save as", save = true, filename = "new-character.aseprite",
  filetypes = { "aseprite" } }
dialog:button { id = "ok", text = "Create" }
dialog:button { id = "cancel", text = "Cancel" }
dialog:show()
local data = dialog.data
if not data.ok then return end

-- RGB mode: in indexed mode Aseprite would treat palette index 0 (the darkest color, used for
-- outlines) as transparent.
local sprite = Sprite(48, 48, ColorMode.RGB)
if app.fs.isFile(data.palette) then
  sprite:setPalette(Palette { fromFile = data.palette })
else
  app.alert("Palette not found: " .. data.palette .. "\nLoad palette/resurrect-64.gpl manually.")
end
sprite.layers[1].name = "body"

local total = 0
for _, action in ipairs(ACTIONS) do total = total + action.frames * #DIRECTIONS end
for _ = 2, total do sprite:newEmptyFrame(#sprite.frames + 1) end

local frame = 1
for _, action in ipairs(ACTIONS) do
  for _, direction in ipairs(DIRECTIONS) do
    local first = frame
    for _ = 1, action.frames do
      sprite.frames[frame].duration = action.ms / 1000
      frame = frame + 1
    end
    local tag = sprite:newTag(first, frame - 1)
    tag.name = action.name .. "." .. direction
    -- Play once (Aseprite 1.3+); older versions loop, which the game also handles.
    if action.once then pcall(function() tag.repeats = 1 end) end
  end
end

-- The weapon grip attaches to this pixel. Move the slice on each frame where the hand moves.
local hand = sprite:newSlice(Rectangle(31, 34, 1, 1))
hand.name = "hand"
hand.pivot = Point(0, 0)

if data.file and data.file ~= "" then sprite:saveAs(data.file) end
