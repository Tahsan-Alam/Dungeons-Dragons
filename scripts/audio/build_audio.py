"""Builds public/audio/{music,ambience,sfx} from downloaded CC0 sources (see docs/SOUND.md and public/audio/CREDITS.md).

Usage:  python scripts/audio/build_audio.py <sources-dir> <ffmpeg> [out-dir]
<sources-dir> holds the packs listed in SOURCES, downloaded from OpenGameArt and unpacked beside their archives
(archives under x/<archive name>/, single files under dl/). Nothing here is fetched at build or play time.

Every output is trimmed, given its loudness target, encoded as MP3 (music 96 kb/s stereo, ambience 64 kb/s,
effects 80 kb/s mono) and listed with its source in credits.json, which public/audio/CREDITS.md is written from.
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SRC, FF = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'audio')

# Source packs: key -> (title, author, page). All CC0 1.0 (checked on each page, and in each pack's licence file).
SOURCES = {
 'kenney-rpg': ('RPG Audio (50 RPG sound effects)', 'Kenney', 'https://opengameart.org/content/50-rpg-sound-effects'),
 'kenney-ui': ('Interface Sounds', 'Kenney', 'https://opengameart.org/content/interface-sounds'),
 'kenney-casino': ('Casino Audio', 'Kenney', 'https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips'),
 'rd-rpg': ('80 CC0 RPG SFX', 'rubberduck', 'https://opengameart.org/content/80-cc0-rpg-sfx'),
 'rd-creature': ('80 CC0 creature SFX', 'rubberduck', 'https://opengameart.org/content/80-cc0-creature-sfx'),
 'rd-break': ('75 CC0 breaking/falling/hit SFX', 'rubberduck', 'https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx'),
 'rd-water': ('40 CC0 water/splash/slime SFX', 'rubberduck', 'https://opengameart.org/content/40-cc0-water-splash-slime-sfx'),
 'up-150': ('150 combat sound effects (compiled CC0: Kenney Impact Sounds, lentikula spell impacts)', 'untamedpixels', 'https://opengameart.org/content/150-combat-sound-effects'),
 'jaggedstone-magic': ('Magic spell SFX', 'jaggedstone', 'https://opengameart.org/content/magic-spell-sfx'),
 'cure': ('Cure magic', 'someoneman', 'https://opengameart.org/content/cure-magic'),
 'tinysized': ('Fantasy sound effects (Tinysized SFX)', 'vehicle', 'https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx'),
 'swishes': ('Swishes sound pack', 'artisticdude', 'https://opengameart.org/content/swishes-sound-pack'),
 'ad-rpg': ('RPG sound pack', 'artisticdude', 'https://opengameart.org/content/rpg-sound-pack'),
 'book-flips': ('10 book page flips', 'starninjas', 'https://opengameart.org/content/10-book-page-flips'),
 'map': ('Opening and closing a map', 'spring-spring', 'https://opengameart.org/content/opening-and-closing-a-map-sounds'),
 'dice': ('2 dice roll, 29 throws', 'rpg', 'https://opengameart.org/content/2-dice-roll-29-throws'),
 'fantozzi': ("Fantozzi's footsteps (grass/sand, stone)", 'qubodup', 'https://opengameart.org/content/fantozzis-footsteps-grasssand-stone'),
 'bells': ('Bell dings/chimes', 'pwl', 'https://opengameart.org/content/bell-dingschimes'),
 'monster-roar': ('Deep monster roar', 'trazzz123', 'https://opengameart.org/content/cc0-deep-monster-roar'),
 'sn-monster': ('16 monster growls', 'starninjas', 'https://opengameart.org/content/16-monster-growls'),
 'gulls': ('Solo seagull sound effects', 'rango-mango', 'https://opengameart.org/content/solo-seagull-sound-effects'),
 'birds': ('Ambient bird sounds', 'isaiah658', 'https://opengameart.org/content/ambient-bird-sounds'),
 'crickets': ('Crickets ambient noise (loopable)', 'wolfgang', 'https://opengameart.org/content/crickets-ambient-noise-loopable'),
 'park': ('Park ambiences', 'thimras', 'https://opengameart.org/content/park-ambiences'),
 'waves': ('Sea and river wave sounds', 'randommind', 'https://opengameart.org/content/sea-and-river-wave-sounds'),
 'dungeon': ('Loopable dungeon ambience', 'jaggedstone', 'https://opengameart.org/content/loopable-dungeon-ambience'),
 'wind-woosh': ('Wind whoosh loop', 'sketchman3', 'https://opengameart.org/content/wind-whoosh-loop'),
 'fireplace': ('Fireplace sound loop', 'pagdev', 'https://opengameart.org/content/fireplace-sound-loop'),
 'm-exploration': ('Medieval: Exploration', 'RandomMind', 'https://opengameart.org/content/medieval-exploration'),
 'm-victory': ('Medieval: Victory theme', 'RandomMind', 'https://opengameart.org/content/medieval-victory-theme'),
 'm-defeat': ('Medieval: Defeat theme', 'RandomMind', 'https://opengameart.org/content/medieval-defeat-theme'),
 'm-battle': ('Medieval: Battle', 'RandomMind', 'https://opengameart.org/content/medieval-battle'),
 'm-moon': ('Fantasy: Rising Moon', 'RandomMind', 'https://opengameart.org/content/fantasy-rising-moon'),
 'm-whisper': ('Forest Whisper theme', 'Cleyton Kauffman', 'https://opengameart.org/content/forest-whisper-theme'),
 'm-darkforest': ('Dark forest theme', 'cynicmusic', 'https://opengameart.org/content/dark-forest-theme'),
 'm-temple': ('Ancient temple', 'umplix', 'https://opengameart.org/content/ancient-temple-1'),
 'm-merchants': ('Merchants and sea salt', 'nbjdlukasabsolute', 'https://opengameart.org/content/merchants-and-sea-salt'),
 'm-ocean': ('Eyes of the ocean (dark loop)', 'Tsorthan Grove', 'https://opengameart.org/content/eyes-of-the-ocean'),
 'm-town': ('Calming RPG town theme', 'destin715', 'https://opengameart.org/content/calming-rpg-town-theme'),
 'm-boss': ('Epic boss battle (seamlessly looping)', 'Juhani Junkala (SubspaceAudio)', 'https://opengameart.org/content/boss-battle-music'),
 'm-choir': ('Fantasy choir 1', 'cesisco', 'https://opengameart.org/content/fantasy-choir-3-orchestral-pieces'),
 'm-forest': ('Beautiful forest (orchestra)', 'nene', 'https://opengameart.org/content/beautiful-forest-orchestra'),
}

X = 'x/'
K = X + 'RPGsounds_Kenney/OGG/'; UI = X + 'kenney_interfaceSounds/Audio/'; CAS = X + 'kenney_casino-audio/Audio/'
RD = X + '80-CC0-RPG-SFX_0/'; CR = X + '80-CC0-creature-SFX_0/'; BR = X + 'sfx_breaking_and_falling/'; WA = X + 'water-splash-slime-sfx/'
P150 = X + '150gameeffectsounds/'; TS = X + 'tinysized/sfx-cc0/'; SW = X + 'swishes/swishes/'; AD = X + 'rpg_sound_pack/RPG Sound Pack/'
BF = X + 'book_flips_-_starninjas/'; DI = X + 'Dice sound/'; FZ = X + 'Fantozzi-footsteps/Fantozzi-footsteps/ogg/'; SN = X + 'monster_-_starninjas/'

def first(prefix, name):
    """150-pack files carry long suffixes; match by prefix."""
    d = os.path.join(SRC, P150, prefix)
    return P150 + prefix + '/' + next(f for f in sorted(os.listdir(d)) if f.startswith(name))

# Effects: name -> (source key, [files]). Several files become numbered variations (name-1, name-2 ...).
SFX = {
 # The table and its books
 'ui-page': ('kenney-rpg', [K + 'bookFlip1.ogg', K + 'bookFlip2.ogg', K + 'bookFlip3.ogg']),
 'ui-open': ('book-flips', [BF + 'book_flip.3.ogg', BF + 'book_flip.6.ogg']),
 'ui-close': ('kenney-rpg', [K + 'bookClose.ogg']),
 'ui-book-open': ('kenney-rpg', [K + 'bookOpen.ogg']),
 'ui-toggle': ('kenney-rpg', [K + 'metalClick.ogg']),
 'ui-latch': ('kenney-rpg', [K + 'metalLatch.ogg']),
 'ui-tick': ('kenney-ui', [UI + 'tick_002.ogg']),
 'ui-select': ('kenney-rpg', [K + 'handleSmallLeather.ogg', K + 'handleSmallLeather2.ogg']),
 'ui-confirm': ('bells', ['dl/bell_ding2.wav']),
 'ui-deny': ('rd-rpg', [RD + 'item_wood_01.ogg']),
 'ui-notice': ('kenney-ui', [UI + 'pluck_001.ogg']),
 'ui-map-open': ('map', ['dl/snd_use_map.wav']),
 'ui-map-close': ('map', ['dl/snd_close_map.wav']),
 'ui-seal': ('tinysized', [TS + 'wood-twigs-break-01.wav']),
 'ui-unfold': ('tinysized', [TS + 'cover-paper-tear-01.wav']),
 'ui-join': ('tinysized', [TS + 'chimes-wood-rattle.wav']),
 'ui-voice-on': ('kenney-ui', [UI + 'maximize_003.ogg']),
 'ui-voice-off': ('kenney-ui', [UI + 'minimize_003.ogg']),
 'ui-coins': ('kenney-rpg', [K + 'handleCoins.ogg']),
 # Dice
 'dice-shake': ('kenney-casino', [CAS + 'dice-shake-1.ogg', CAS + 'dice-shake-2.ogg']),
 'dice-throw': ('dice', [DI + 'dice-3.wav', DI + 'dice-8.wav', DI + 'dice-14.wav', DI + 'dice-21.wav']),
 # Steps
 'step-soft': ('fantozzi', [FZ + 'Fantozzi-SandL1.ogg', FZ + 'Fantozzi-SandR1.ogg', FZ + 'Fantozzi-SandL2.ogg', FZ + 'Fantozzi-SandR2.ogg']),
 'step-stone': ('fantozzi', [FZ + 'Fantozzi-StoneL1.ogg', FZ + 'Fantozzi-StoneR1.ogg', FZ + 'Fantozzi-StoneL2.ogg', FZ + 'Fantozzi-StoneR2.ogg']),
 'step-wood': ('kenney-rpg', [K + 'footstep01.ogg', K + 'footstep03.ogg', K + 'footstep05.ogg', K + 'footstep07.ogg']),
 'step-water': ('rd-water', [WA + 'splash_02.ogg', WA + 'splash_05.ogg', WA + 'splash_09.ogg']),
 # Blows
 'swing': ('swishes', [SW + 'swish-1.wav', SW + 'swish-2.wav', SW + 'swish-3.wav']),
 'swing-heavy': ('swishes', [SW + 'swish-9.wav', SW + 'swish-11.wav']),
 'hit': ('up-150', [first('01_combat_melee', 'impact_punch_medium_00' + str(i)) for i in (0, 2, 4)]),
 'hit-heavy': ('up-150', [first('01_combat_melee', 'impact_punch_heavy_00' + str(i)) for i in (0, 2)]),
 'clash': ('tinysized', [TS + 'sword-clash-01.wav', TS + 'sword-clash-03.wav', TS + 'sword-clash-05.wav']),
 'blade-draw': ('ad-rpg', [AD + 'battle/sword-unsheathe.wav', AD + 'battle/sword-unsheathe3.wav']),
 'knife': ('kenney-rpg', [K + 'knifeSlice.ogg', K + 'knifeSlice2.ogg']),
 'arrow': ('tinysized', [TS + 'arrow-feathers-01.wav']),
 'quiver': ('tinysized', [TS + 'arrow-grab-from-quiver-01.wav', TS + 'arrow-grab-from-quiver-02.wav']),
 'spell-cast': ('jaggedstone-magic', ['dl/magical_1_0.ogg', 'dl/magical_3.ogg', 'dl/magical_5.ogg']),
 'spell-fire': ('up-150', [first('04_magic_spells', 'Fire Spell Impact ' + str(i)) for i in (1, 3)]),
 'heal': ('up-150', [first('04_magic_spells', 'Healing Spell Impact ' + str(i)) for i in (1, 4, 7)]),
 'song': ('up-150', [first('04_magic_spells', 'Healing Spell Impact 12')]),
 'roots': ('up-150', [first('04_magic_spells', 'Plant Spell Impact ' + str(i)) for i in (1, 3)]),
 'shield': ('rd-break', [BR + 'bfh1_metal_hit_02.ogg', BR + 'bfh1_metal_hit_04.ogg']),
 'guard': ('ad-rpg', [AD + 'inventory/chainmail1.wav']),
 'uncork': ('tinysized', [TS + 'bottle-glass-uncork-01.wav']),
 'drink': ('ad-rpg', [AD + 'inventory/bubble.wav']),
 'revive': ('cure', [X + 'curemagic/Cure2.wav']),
 'fall': ('rd-break', [BR + 'bfh1_falling_02.ogg', BR + 'bfh1_falling_05.ogg']),
 # Chests, shards, gateways and the road
 'chest-unlock': ('tinysized', [TS + 'keyhole-lockbox-turn-01.wav']),
 'chest-open': ('kenney-rpg', [K + 'creak1.ogg']),
 'shard': ('rd-rpg', [RD + 'item_gem_02.ogg']),
 'shard-bell': ('bells', ['dl/bell_ding1.wav']),
 'gateway': ('up-150', [first('04_magic_spells', 'Wind Spell Impact 3')]),
 'relight': ('kenney-ui', [UI + 'glass_001.ogg', UI + 'glass_002.ogg', UI + 'glass_003.ogg']),
 'turn-yours': ('bells', ['dl/bell_ding3.wav']),
 'turn-foes': ('kenney-ui', [UI + 'bong_001.ogg']),
 # Keepers
 'keeper-wolf': ('rd-creature', [CR + 'howl.ogg']),
 'keeper-breath': ('rd-creature', [CR + 'breath.ogg']),
 'keeper-glass': ('kenney-ui', [UI + 'glass_005.ogg']),
 'keeper-stone': ('ad-rpg', [AD + 'NPC/giant/giant2.wav']),
 'release-pounce': ('rd-creature', [CR + 'roar_01.ogg']),
 'release-fire': ('rd-rpg', [RD + 'spell_fire_01.ogg', RD + 'spell_fire_04.ogg']),
 'release-tide': ('up-150', [first('04_magic_spells', 'Water Spell Impact ' + str(i)) for i in (1, 3)]),
 'release-rock': ('rd-break', [BR + 'bfh1_rock_falling_02.ogg', BR + 'bfh1_rock_falling_05.ogg']),
 'keeper-fall': ('monster-roar', ['dl/monster_roar.wav']),
 # Creature voices by family: notice / hurt / defeated
 'v-imp': ('rd-creature', [CR + 'cute_02.ogg', CR + 'cute_05.ogg', CR + 'cute_08.ogg']),
 'v-goblin': ('rd-creature', [CR + 'grunt_01.ogg', CR + 'grunt_03.ogg', CR + 'grunt_05.ogg']),
 'v-wisp': ('ad-rpg', [AD + 'NPC/shade/shade1.wav', AD + 'NPC/shade/shade4.wav', AD + 'NPC/shade/shade9.wav']),
 'v-stone': ('ad-rpg', [AD + 'NPC/giant/giant1.wav', AD + 'NPC/giant/giant3.wav', AD + 'NPC/giant/giant5.wav']),
 'v-beast': ('ad-rpg', [AD + 'NPC/gutteral beast/mnstr1.wav', AD + 'NPC/gutteral beast/mnstr4.wav', AD + 'NPC/gutteral beast/mnstr9.wav']),
 'v-ooze': ('ad-rpg', [AD + 'NPC/slime/slime1.wav', AD + 'NPC/slime/slime4.wav', AD + 'NPC/slime/slime8.wav']),
 'v-crab': ('ad-rpg', [AD + 'NPC/beetle/bite-small.wav', AD + 'NPC/beetle/bite-small2.wav', AD + 'NPC/beetle/bite-small3.wav']),
 'v-eel': ('rd-creature', [CR + 'burble_01.ogg', CR + 'burble_02.ogg', CR + 'spit_02.ogg']),
 'v-moth': ('rd-creature', [CR + 'bug_01.ogg', CR + 'bug_02.ogg', CR + 'bug_04.ogg']),
 'v-wolf': ('ad-rpg', [AD + 'NPC/misc/wolfman.wav', CR + 'hurt_02.ogg', CR + 'howl.ogg']),
 'v-dragon': ('rd-creature', [CR + 'roar_02.ogg', CR + 'roar_03.ogg', CR + 'monster_05.ogg']),
 'v-monster': ('sn-monster', [SN + 'monster.2.ogg', SN + 'monster.6.ogg', SN + 'monster.11.ogg']),
 'gull': ('gulls', ['dl/Seagull Ambient 1.wav', 'dl/Seagull Ambient 2.wav', 'dl/Seagull Ambient 3.wav']),
}
# Longest a cue may ring, in seconds (the rest fades).
LIMIT = {'ui-join': 1.8, 'keeper-fall': 4, 'gull': 2.2, 'gateway': 2}
# Mixed sources inside one family (v-wolf) are credited per file below.
FILE_SOURCE = {CR: 'rd-creature', AD: 'ad-rpg'}

# Music: name -> (source key, file, start s, length s or None, seamless loop crossfade s or 0)
MUSIC = {
 'title': ('m-exploration', 'dl/Exploration.mp3', 0, 150, 6),
 'camp': ('m-town', 'dl/CalmTownTheme_0.mp3', 0, None, 4),
 'lanternwood-day': ('m-whisper', 'x/forest_whisper_theme/Forest Whisper Theme/Forest Whisper.ogg', 0, None, 0),
 'lanternwood-dusk': ('m-darkforest', 'dl/GameMusic_ForestTheme_24_0.mp3', 0, None, 4),
 'reach-day': ('m-temple', 'dl/ancient_temple.wav', 0, None, 4),
 'reach-dusk': ('m-moon', 'dl/Rising_Moon_0.mp3', 0, 150, 6),
 'saltreach-day': ('m-merchants', 'dl/merchants_and_sea_salt.wav', 0, None, 4),
 'saltreach-dusk': ('m-ocean', 'dl/dark_eyes_of_the_ocean_0.ogg', 0, None, 0),
 'peril': ('m-battle', 'dl/battle_8.mp3', 0, None, 3),
 'keeper': ('m-boss', 'dl/Juhani Junkala - Epic Boss Battle [Seamlessly Looping].wav', 0, None, 0),
 'road': ('m-choir', 'dl/Fantasy Choir 1.mp3', 0, None, 0),
 'victory': ('m-victory', 'dl/victory.mp3', 0, None, 0),
 'defeat': ('m-defeat', 'dl/defeat.mp3', 0, None, 0),
 'replay': ('m-forest', 'dl/beautiful_forest_16bit_44.1khz_1.ogg', 0, None, 4),
}
# Ambience beds: name -> (source key, file, start s, length s, crossfade s, loudness LUFS)
AMBIENCE = {
 'birds': ('birds', 'dl/birds-isaiah658.ogg', 0, 30, 3, -30),
 'wind': ('park', 'dl/park_ambience_wind.wav', 20, 60, 4, -32),
 'wind-high': ('wind-woosh', 'dl/wind woosh loop.ogg', 0, None, 0, -34),
 'crickets': ('crickets', 'dl/crickets_1.mp3', 0, None, 0, -32),
 'waves': ('waves', 'dl/VistulaShort.mp3', 30, 60, 4, -28),
 'cave': ('dungeon', 'dl/dungeon_ambient_1.ogg', 0, 60, 4, -30),
 'fire': ('fireplace', 'dl/fire.wav', 0, 28, 2, -28),
}

def decode(path, start=0, length=None, channels=1, rate=44100):
    args = [FF, '-v', 'error', '-ss', str(start)] + (['-t', str(length)] if length else []) + ['-i', os.path.join(SRC, path), '-ac', str(channels), '-ar', str(rate), '-f', 'f32le', '-']
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()

def loudness(x, rate=44100):
    """Gated RMS loudness, close enough to LUFS for setting levels between files."""
    win = rate * 4 // 10; n = len(x) // win
    if n == 0: return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)
    blocks = np.sqrt((x[:n * win] ** 2).reshape(n, win, -1).mean(axis=(1, 2)))
    db = 20 * np.log10(blocks + 1e-9); gated = db[db > -60]
    return float(10 * np.log10((10 ** (gated / 10)).mean())) if len(gated) else -60.0

def seamless(x, fade, rate=44100):
    """Fold the last `fade` seconds over the start so the file loops without a seam."""
    f = int(fade * rate)
    if f <= 0 or len(x) < 3 * f: return x
    body = x[:-f].copy(); tail = x[-f:]
    t = np.linspace(0, 1, f)[:, None]
    body[:f] = body[:f] * np.sqrt(t) + tail * np.sqrt(1 - t)
    return body

def trim_silence(x, threshold=10 ** (-50 / 20)):
    loud = np.where(np.abs(x).max(axis=1) > threshold)[0]
    if not len(loud): return x
    return x[max(0, loud[0] - 64): loud[-1] + 2048]

def encode(x, out, channels, kbps, rate=44100):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp: name = tmp.name
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(name, 'wb') as w: w.setnchannels(channels); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm.tobytes())
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run([FF, '-v', 'error', '-y', '-i', name, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ac', str(channels), out], check=True)
    os.remove(name)

credits = {'music': {}, 'ambience': {}, 'sfx': {}}
for name, (src, path, start, length, fade) in MUSIC.items():
    x = decode(path, start, (length + fade) if length else None, channels=2)
    x = seamless(x, fade)
    x *= 10 ** ((-19 - loudness(x)) / 20); peak = np.abs(x).max()
    if peak > .95: x *= .95 / peak
    encode(x, os.path.join(OUT, 'music', name + '.mp3'), 2, 96)
    credits['music'][name] = {'source': src, 'file': os.path.basename(path), 'seconds': round(len(x) / 44100, 1), 'loops': bool(fade) or name not in ('road', 'victory', 'defeat')}
for name, (src, path, start, length, fade, target) in AMBIENCE.items():
    x = decode(path, start, (length + fade) if length else None, channels=1)
    x = seamless(x, fade)
    x *= 10 ** ((target - loudness(x)) / 20)
    encode(x, os.path.join(OUT, 'ambience', name + '.mp3'), 1, 64)
    credits['ambience'][name] = {'source': src, 'file': os.path.basename(path), 'seconds': round(len(x) / 44100, 1)}
counts = {}
for name, (src, files) in SFX.items():
    counts[name] = len(files)
    for i, path in enumerate(files, 1):
        x = trim_silence(decode(path))[: int(44100 * LIMIT.get(name, 6))]
        fade = min(len(x) // 4, 2205 if name not in LIMIT else 22050); x[-fade:] *= np.linspace(1, 0, fade)[:, None]
        x *= 10 ** (-3 / 20) / (np.abs(x).max() + 1e-9)  # peak at -3 dBFS; the game sets each cue's level
        out = f'{name}-{i}' if len(files) > 1 else name
        encode(x, os.path.join(OUT, 'sfx', out + '.mp3'), 1, 80)
        own = next((k for p, k in FILE_SOURCE.items() if path.startswith(p)), src)
        credits['sfx'][out] = {'source': own, 'file': os.path.basename(path), 'seconds': round(len(x) / 44100, 2)}
json.dump({'sources': {k: {'title': t, 'author': a, 'page': p, 'license': 'CC0 1.0'} for k, (t, a, p) in SOURCES.items()}, 'variations': counts, **credits},
          open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('music', len(MUSIC), 'ambience', len(AMBIENCE), 'effects', sum(counts.values()))

# The credits page, from the same list: every shipped file, its source pack, author, page and licence.
data = json.load(open(os.path.join(OUT, 'credits.json'), encoding='utf8'))
lines = ['# Sound credits', '',
 'Every sound, theme and ambience bed in this folder comes from an OpenGameArt pack released under **CC0 1.0** (public domain dedication).',
 'CC0 asks for no attribution; we credit every author anyway. The files were trimmed, levelled and re-encoded by `scripts/audio/build_audio.py`;',
 'the interface click and hover (`click-thock.wav`, `hover-thock.wav`) are credited in the project\'s CREDITS.md.', '',
 '## Sources', '', '| Pack | Author | Page | Licence |', '|---|---|---|---|']
for key, s in data['sources'].items():
    lines.append(f"| {s['title']} | {s['author']} | {s['page']} | {s['license']} |")
for group, title in (('music', 'Music'), ('ambience', 'Ambience'), ('sfx', 'Effects')):
    lines += ['', f'## {title}', '', '| File | Source pack | Original file |', '|---|---|---|']
    for name, entry in data[group].items():
        s = data['sources'][entry['source']]
        lines.append(f"| `{group}/{name}.mp3` | {s['title']} ({s['author']}) | {entry['file']} |")
open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf8').write('\n'.join(lines) + '\n')
