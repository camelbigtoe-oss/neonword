// Answer lists with clues. Format per line: WORD:clue
// Any answer word is always a valid guess. Other guesses are checked
// against an online dictionary (cached), and accepted when offline.
const RAW_WORDS = {
4: `
ACID:Sour chemical that turns litmus red
ARCH:Curved structure over an opening
ATOM:Smallest unit of an element
AURA:Distinctive glow around a person
AXLE:Rod a wheel turns on
BAKE:Cook with dry heat in an oven
BARK:Dog's sound, or a tree's skin
BEAM:Ray of light, or a long timber
BOLT:Lightning strike, or a door lock
BONE:Part of a skeleton
BYTE:Eight bits of data
CALM:Peaceful, without worry
CHIP:Tiny circuit, or a fried potato slice
CLAW:Sharp curved nail of a cat
CODE:What programmers write
CORE:Centre of an apple or a reactor
CROW:Black bird, or boast loudly
DASH:Short sprint, or a punctuation line
DAWN:First light of day
DECK:Pack of cards, or floor of a ship
DOME:Rounded roof
DUSK:Fading light of evening
ECHO:Sound bouncing back
EDGE:Outer border, or slight advantage
FANG:Long pointed tooth
FLUX:Constant change
FOAM:Mass of tiny bubbles
FROG:Hopping green amphibian
GATE:Hinged barrier in a fence
GLOW:Steady soft light
GRID:Network of crossing lines
HACK:Clever trick, or break into a system
HALO:Ring of light over a head
HAZE:Thin mist in the air
HELM:Ship's steering wheel
HERO:Brave rescuer
HOOK:Curved catcher, or a catchy riff
HUSH:Make quiet
ICON:Small picture on a screen
JADE:Green ornamental stone
JAZZ:Improvised music style
JOLT:Sudden jerk or shock
KEEN:Eager, or sharp
KNOT:Tied loop in rope
LAMP:Light on a desk
LAVA:Molten rock from a volcano
LENS:Curved glass that focuses light
LOOP:Circle of string, or repeated code
LUNA:Latin name for the moon
MAZE:Puzzle of winding paths
MESH:Net-like fabric
MINT:Cool herb, or brand new
MIST:Fine water vapour in the air
MOTH:Night-flying insect drawn to lamps
NEON:Glowing gas in bright signs
NODE:Point where lines meet in a network
NOVA:Star that suddenly brightens
OMEN:Sign of things to come
ONYX:Black gemstone
OPAL:Iridescent gemstone
QUIZ:Short test of knowledge
RAIN:Water falling from clouds
RIFT:Crack or split
ROOF:Top covering of a building
RUNE:Ancient magic letter
SALT:Seasoning from the sea
SILK:Smooth fabric spun by worms
SLOT:Narrow opening for a coin
SNOW:Frozen flakes from the sky
SOUL:Spirit of a person
SPIN:Rotate quickly
TIDE:Rise and fall of the sea
TOWN:Small city
VAST:Enormous in area
VOID:Empty space
WARP:Bend out of shape, or jump through space
WAVE:Ocean swell, or a hand greeting
WISP:Thin curl of smoke
WOLF:Wild dog that howls
YARN:Thread for knitting, or a long tale
ZERO:Nothing at all
ZONE:Area with a special purpose
`,
5: `
ABBEY:Monastery or convent
ACORN:Seed of an oak tree
ADORE:Love deeply
AGENT:Spy, or someone who acts for another
ALARM:Warning bell or siren
ALBUM:Collection of songs or photos
ALIEN:Visitor from another world
ALLEY:Narrow street between buildings
AMBER:Fossil tree resin, orange-gold
ANGEL:Winged heavenly being
ANGLE:Corner measured in degrees
APRON:Garment worn while cooking
ARENA:Stadium for contests
ARMOR:Protective metal suit
ARROW:Shot from a bow
ATLAS:Book of maps
AWAKE:Not sleeping
BADGE:Pinned emblem of rank
BASIL:Herb used in pesto
BEACH:Sandy shore
BEAST:Wild animal or monster
BLADE:Cutting edge of a knife
BLAZE:Large fierce fire
BLEND:Mix smoothly together
BLOOM:Flower opening
BOARD:Plank, or get on a train
BRAIN:Organ you are training now
BRAVE:Facing fear head-on
BREAD:Baked loaf
BRICK:Clay block for walls
BRUSH:Tool for painting or hair
CABIN:Small wooden house
CANDY:Sweet treat
CHAIN:Linked metal rings
CHAOS:Total disorder
CHARM:Appeal, or a lucky trinket
CHEST:Treasure box, or upper body
CHORD:Notes played together
CLOCK:Tells the time
CLOUD:Floating mass of vapour
COBRA:Hooded venomous snake
CORAL:Reef-building sea creature
CRANE:Tall bird, or construction lifter
CRASH:Collision, or a program failure
CREEK:Small stream
CROWN:Royal headwear
CRYPT:Underground tomb
CYBER:Relating to computers and networks
DAISY:White petalled flower
DANCE:Move to music
DELTA:River mouth, or Greek letter D
DEPTH:Distance downward
DINER:Roadside restaurant
DRAFT:First version, or cool breeze
DRAIN:Pipe that carries water away
DREAM:Visions while sleeping
DRIFT:Float along slowly
DRONE:Flying robot, or a low hum
EAGLE:Large bird of prey
EARTH:Our planet
ELBOW:Joint in the middle of the arm
EMBER:Glowing piece of coal
ENEMY:Foe or opponent
ENTRY:Way in
EPOCH:Era in history
EQUAL:The same in value
FABLE:Short moral story
FAINT:Barely visible, or pass out
FEAST:Large festive meal
FERRY:Boat that carries passengers across
FIBER:Thread, or a fast internet cable
FIELD:Open grassland
FLAME:Tongue of fire
FLASH:Sudden burst of light
FLEET:Group of ships
FLINT:Stone that makes sparks
FLOOD:Overflow of water
FLUTE:Wind instrument played sideways
FOCUS:Centre of attention
FORGE:Blacksmith's furnace, or fake
FROST:Ice crystals on cold mornings
FRUIT:Apple or orange
GHOST:Spirit of the dead
GIANT:Huge person
GLASS:Clear brittle material
GLEAM:Shine brightly
GLIDE:Move smoothly through the air
GLOBE:Spherical map of Earth
GRAPE:Fruit used for wine
GRAPH:Chart of data
GROVE:Small group of trees
GUARD:Protect, or a protector
GUIDE:Show the way
HAVEN:Safe place
HEART:Pumps blood
HONEY:Sweet stuff made by bees
HOUSE:Place to live
IGLOO:Snow house
IMAGE:Picture
IVORY:Off-white tusk material
JEWEL:Precious stone
JOKER:Wild card, or a prankster
JUICE:Squeezed fruit drink
KARMA:What goes around comes around
KNIFE:Cutting tool
LASER:Focused beam of light
LEMON:Sour yellow fruit
LEVEL:Flat, or a stage in a game
LIGHT:Opposite of dark
LUCKY:Fortunate
LUNAR:Relating to the moon
MAGIC:Spells and illusions
MAPLE:Tree with syrup
MARCH:Walk in step, or a month
MEDAL:Award for first place
METAL:Iron or steel
MIRTH:Laughter and joy
MODEL:Small copy, or fashion poser
MONEY:Cash
MOUSE:Small rodent, or computer pointer
NERVE:Courage, or a signal fibre
NIGHT:Time of darkness
NINJA:Stealthy Japanese warrior
NOBLE:Of high rank or fine character
NORTH:Direction of the pole star
OCEAN:Vast body of salt water
OLIVE:Small fruit pressed for oil
ORBIT:Path around a planet
OTTER:Playful river mammal
PANEL:Flat board, or a group of judges
PEACH:Fuzzy sweet fruit
PEARL:Gem from an oyster
PIANO:Instrument with 88 keys
PILOT:Flies a plane
PIXEL:Tiny dot on a screen
PLANT:Living green thing
PLAZA:Open public square
POLAR:Relating to the poles
POWER:Strength or energy
PRISM:Splits light into colours
PULSE:Heartbeat felt in the wrist
QUEEN:Female monarch
QUEST:Long search or mission
QUIET:Making little noise
RADAR:Detects objects with radio waves
RAVEN:Large black bird
REALM:Kingdom
RIDGE:Long narrow hilltop
RIVER:Flowing water
ROBOT:Machine that acts on its own
ROUTE:Path taken
SABER:Curved sword
SCALE:Fish skin plate, or weighing device
SHADE:Area out of the sun
SHARD:Broken sharp piece
SHELL:Hard outer case
SIGIL:Magic symbol
SKULL:Bony head
SLATE:Grey rock, or a clean record
SMOKE:Rises from fire
SOLAR:Relating to the sun
SPARK:Tiny flash of fire
SPICE:Flavouring like cumin
SPIKE:Sharp point
STORM:Wild weather
SUGAR:Sweetener
SWIFT:Fast, or a fast bird
SWORD:Long bladed weapon
TIGER:Striped big cat
TOKEN:Symbol, or arcade coin
TORCH:Portable flame or flashlight
TOWER:Tall building
TRAIN:Runs on rails
ULTRA:Beyond the usual
UNITY:Being joined as one
URBAN:Of the city
VALOR:Great courage
VAPOR:Steam or mist
VAULT:Secure room, or leap
VENOM:Snake poison
VIRAL:Spreading fast online
VIVID:Bright and intense
VOICE:Sound you speak with
WATCH:Look at, or a wrist clock
WHEEL:Round thing a car rolls on
WITCH:Spell-caster
WORLD:The Earth and all on it
YACHT:Luxury sailing boat
YOUTH:Being young
ZEBRA:Striped horse
`,
6: `
ACTION:Something done
ANCHOR:Holds a ship in place
ARCADE:Hall of coin-op games
ARTIST:Painter or creator
AUTUMN:Season of falling leaves
BAMBOO:Tall grass pandas eat
BANNER:Long flag or sign
BEACON:Signal light
BEETLE:Hard-shelled insect
BINARY:Ones and zeros
BLAZER:Sports jacket
BORROW:Take with a promise to return
BOTTLE:Container with a neck
BREEZE:Gentle wind
BRIDGE:Spans a river
BUCKET:Pail
CACTUS:Spiky desert plant
CAMERA:Takes photos
CANDLE:Wax light
CANYON:Deep valley with steep sides
CARBON:Element in all life
CASTLE:Fortress of a king
CHROME:Shiny metal plating
CINEMA:Movie theatre
CIPHER:Secret code
CIRCUS:Show with clowns and acrobats
COBALT:Deep blue metal
COFFEE:Morning brew
COSMIC:Relating to the universe
DANGER:Risk of harm
DECODE:Turn a cipher into plain text
DESERT:Dry sandy land
DRAGON:Fire-breathing beast
EMPIRE:Group of nations under one ruler
ENERGY:Power to do work
ENGINE:Machine that makes motion
FALCON:Fast bird of prey
FLIGHT:Act of flying
FOREST:Land covered with trees
FROZEN:Turned to ice
GALAXY:Huge system of stars
GARDEN:Plot for growing flowers
GLITCH:Sudden malfunction
GOLDEN:Made of or like gold
HARBOR:Sheltered port
HAMMER:Tool for nails
HUNTER:One who tracks prey
ISLAND:Land surrounded by water
JUNGLE:Dense tropical forest
KNIGHT:Armoured warrior on horseback
LEGEND:Famous old story
LIQUID:Flows like water
MARKET:Place to buy and sell
MATRIX:Grid of numbers
MEADOW:Grassy field
MEMORY:Ability to remember
METEOR:Shooting star
MIRROR:Reflects your image
MOSAIC:Picture made of tiles
MYSTIC:Spiritual seer
NEBULA:Cloud of gas in space
ORACLE:Prophet who sees the future
ORANGE:Citrus fruit, or its colour
OXYGEN:Gas we breathe
PALACE:Royal home
PIRATE:Sea robber
PLANET:World circling a star
POCKET:Pouch in clothing
POTION:Magic drink
PUZZLE:Brain teaser
RABBIT:Long-eared hopper
RADIUS:Centre to edge of a circle
RECORD:Vinyl disc, or best result
RIDDLE:Puzzling question
ROCKET:Launches into space
SAFARI:Wildlife expedition
SCREEN:Display surface
SIGNAL:Sign or transmitted message
SILVER:Shiny grey metal
SKETCH:Rough drawing
SPIRAL:Winding coil shape
STREAM:Small river, or live video
SUMMIT:Peak of a mountain
SYSTEM:Set of connected parts
TEMPLE:Place of worship
THRONE:Royal seat
TICKET:Pass to enter
TUNNEL:Underground passage
TURTLE:Shelled reptile
VECTOR:Arrow with direction and size
VELVET:Soft plush fabric
VORTEX:Swirling whirlpool
WIZARD:Wise magic user
WINTER:Coldest season
ZENITH:Highest point
`,
7: `
ABILITY:Skill or talent
ANCIENT:Very old
ANTENNA:Receives radio signals
BALANCE:Even weight on both sides
BLASTER:Sci-fi energy gun
CAPTAIN:Leader of a ship or team
CARAVAN:Group travelling together
CENTURY:One hundred years
CHAPTER:Section of a book
CIRCUIT:Path for electric current
CLIMATE:Long-term weather
COMPASS:Points north
CONSOLE:Games machine, or comfort
CRYSTAL:Clear sparkling mineral
CURRENT:Flow of water or electricity
DIAMOND:Hardest gemstone
DIGITAL:Using numbers and data
DOLPHIN:Clever sea mammal
DYNAMIC:Full of energy and change
ECLIPSE:Moon blocks the sun
ELEMENT:Basic substance like iron
EMERALD:Green gemstone
EVENING:Late part of the day
FANTASY:Imagined world
FIREFLY:Glowing insect
FORTUNE:Luck, or great wealth
FREEDOM:Being free
GATEWAY:Entrance, or network bridge
GENESIS:The beginning
GRAVITY:Force that pulls things down
HARMONY:Pleasing combination of notes
HARVEST:Gathering of crops
HORIZON:Where sky meets land
IMAGINE:Picture in your mind
JOURNEY:Long trip
JUSTICE:Fairness under law
KINGDOM:Land ruled by a monarch
LANTERN:Portable light in a case
LIBRARY:Building full of books
MACHINE:Device with moving parts
MERCURY:Closest planet to the sun
MISSION:Important task
MONSTER:Scary creature
MYSTERY:Something unexplained
NETWORK:Connected system
NOMADIC:Wandering from place to place
OCTOPUS:Eight-armed sea creature
ORBITAL:Relating to an orbit
PANTHER:Black big cat
PHANTOM:Ghostly figure
PHOENIX:Bird reborn from ashes
PILGRIM:Traveller to a holy place
PLASTIC:Moulded synthetic material
PROGRAM:Set of computer instructions
PYRAMID:Egyptian tomb shape
QUANTUM:Tiny packet of energy
RAINBOW:Arc of colours after rain
RAPTURE:Intense joy
REACTOR:Core of a power plant
SAMURAI:Japanese warrior
SHADOWS:Dark shapes cast by light
SILENCE:Total quiet
SPECTRA:Ranges of colours
STATION:Stop for trains
SUNRISE:Morning appearance of the sun
SURFACE:Outer layer
TEXTURE:How something feels
THUNDER:Boom after lightning
TORNADO:Spinning windstorm
TRUMPET:Brass instrument
UNICORN:Horned magical horse
UPGRADE:Improve to a better version
VOLCANO:Mountain that erupts
WARRIOR:Fighter
WEATHER:Rain, sun or snow
WHISPER:Speak very softly
`
};

// Build lookup: { 4: [{w, c}], ... } dropping placeholders and wrong lengths.
const WORDS = {};
const KNOWN = new Set();
for (const len of Object.keys(RAW_WORDS)) {
  const n = Number(len);
  WORDS[n] = RAW_WORDS[len]
    .trim()
    .split("\n")
    .map((line) => {
      const i = line.indexOf(":");
      return { w: line.slice(0, i).trim().toUpperCase(), c: line.slice(i + 1).trim() };
    })
    .filter((e) => e.w.length === n && /^[A-Z]+$/.test(e.w) && e.c !== "Placeholder");
  WORDS[n].forEach((e) => KNOWN.add(e.w));
}
