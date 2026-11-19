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
BEAR:Large furry animal that hibernates
BELL:Rings in a church tower
BIRD:Feathered flyer
BLUE:Colour of a clear sky
BOAT:Floats on water
BOOK:You read it
BULB:Light source, or a tulip root
CAGE:Barred enclosure
CAKE:Birthday dessert
CAVE:Hollow in a hillside
CLAY:Soft earth used for pottery
COAT:Warm outer garment
COIN:Small round money
COLD:Low in temperature
CORD:Thin rope or cable
CRAB:Sideways-walking shellfish
CUBE:Six-sided solid
DART:Thrown at a board
DEER:Antlered forest animal
DESK:Work table
DICE:Rolled in board games
DIVE:Plunge into water
DOOR:Way into a room
DOVE:Bird of peace
DRUM:Percussion instrument you hit
DUCK:Quacking bird, or bend down
DUNE:Sand hill
FARM:Place with crops and animals
FERN:Leafy plant of damp woods
FIRE:Flames and heat
FISH:Swims with gills
FLAG:Banner on a pole
FORK:Eating utensil with prongs
FUEL:Burned for energy
GEAR:Toothed wheel, or equipment
GIFT:Present
GOAT:Horned farm animal
GOLD:Precious yellow metal
GOLF:Game with clubs and holes
HAWK:Sharp-eyed bird of prey
HEAT:Warmth
HILL:Small mountain
HIVE:Home of bees
HORN:Pointed growth on a head, or a car's beeper
IRON:Metal, or a clothes presser
KITE:Flies on a string
KNEE:Joint in the leg
LAKE:Inland body of water
LEAF:Green part of a tree
LION:King of the jungle
LOCK:Opened with a key
LUCK:Chance or fortune
MASK:Face covering
MILK:White drink from cows
MOON:Lights the night sky
NEST:Bird's home
OVEN:Bakes bread
PALM:Tropical tree, or inside of the hand
PEAK:Mountain top
PINE:Evergreen tree with needles
PLUG:Goes into a socket
POEM:Verse
POOL:Swimming spot
RAFT:Simple floating platform
RING:Worn on a finger
ROAD:Cars drive on it
ROBE:Long loose garment
ROSE:Thorny flower
RUBY:Red gemstone
SAND:Beach grains
SEED:Grows into a plant
SHIP:Large seagoing vessel
SOAP:Used for washing
STAR:Twinkles at night
SWAN:Graceful white water bird
TENT:Camping shelter
TREE:Tall woody plant
VASE:Holds flowers
VINE:Climbing plant
WAND:Wizard's stick
WIND:Moving air
WING:Used for flying
WORM:Wriggles in soil
YOGA:Stretching practice
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
ACTOR:Plays a role
ADULT:Fully grown person
APPLE:Fruit that keeps the doctor away
BACON:Crispy breakfast meat
BAGEL:Ring-shaped bread roll
BANJO:Twangy stringed instrument
BENCH:Long seat
BERRY:Small juicy fruit
BISON:Shaggy wild ox
BLAST:Explosion
BLOCK:Solid chunk
BLUSH:Turn red in the face
BOOTH:Small enclosed stall
BRASS:Yellow metal, or trumpets and horns
BROOM:Sweeps the floor
CAMEL:Humped desert animal
CANAL:Man-made waterway
CARGO:Goods carried by a ship
CEDAR:Fragrant evergreen tree
CHALK:Writes on a blackboard
CHESS:Board game with kings and pawns
CHILI:Hot pepper
CIDER:Apple drink
CLIFF:Steep rock face
CLOAK:Hooded cape
COMET:Icy space rock with a tail
COUCH:Sofa
CRAFT:Skill, or handmade work
CREST:Top of a wave or hill
CRUMB:Tiny piece of bread
CURVE:Bend
DEPOT:Storage station
DITCH:Narrow trench
DOUGH:Unbaked bread
DWARF:Small mythical miner
EMAIL:Electronic message
EVENT:Something that happens
FAIRY:Tiny winged sprite
FENCE:Barrier around a garden
FLOCK:Group of sheep or birds
FLOOR:You stand on it
FORTH:Onward
FORUM:Place for discussion
FROWN:Unhappy face
GAMER:Plays video games
GECKO:Wall-climbing lizard
GLOVE:Worn on the hand
GOOSE:Honking bird
GRAIN:Wheat or rice seed
GRASS:Lawn plant
GRAVY:Meat sauce
GREEN:Colour of grass
HABIT:Regular routine
HATCH:Break out of an egg
HOTEL:Place to stay when travelling
HUMOR:Funniness
INDEX:List at the back of a book
INPUT:Data put in
JELLY:Wobbly dessert
JUMBO:Very large
KAYAK:Paddled canoe
KOALA:Eucalyptus-eating marsupial
LADLE:Soup spoon
LAYER:One level of a cake
LEMUR:Ringtailed primate
LLAMA:Woolly Andes animal
LODGE:Cabin in the hills
LOGIC:Reasoning
LOTUS:Water lily
MAGMA:Molten rock underground
MANGO:Tropical stone fruit
MARSH:Wetland
MATCH:Strikes to make fire, or a game
MELON:Large juicy fruit
MERIT:Worth
MOOSE:Huge antlered deer
MOTOR:Engine
MOVIE:Film
MUSIC:Songs and melodies
NOVEL:Long story book
NURSE:Cares for patients
OASIS:Water in the desert
OPERA:Sung drama
ORGAN:Heart or liver, or a pipe instrument
PAINT:Coloured liquid for walls
PANDA:Black and white bamboo eater
PAPER:You write on it
PARTY:Celebration
PASTA:Spaghetti or penne
PATCH:Small repair piece
PEDAL:Pushed by a foot on a bike
PENNY:One cent coin
PHONE:Device for calls
PIZZA:Cheesy Italian pie
PLAIN:Simple, or flat land
PLANE:Flies in the sky
POUCH:Small bag
PRIZE:Award for winning
PUPPY:Young dog
RADIO:Plays broadcasts
RANCH:Cattle farm
RHYME:Words that sound alike
RIDER:Person on a horse
ROAST:Cook in an oven
ROBIN:Red-breasted bird
ROCKY:Full of stones
SALAD:Bowl of leaves
SAUCE:Poured over food
SCARF:Worn round the neck
SCOUT:Explorer sent ahead
SHARK:Fearsome fish with fins
SHEEP:Woolly farm animal
SHIRT:Top with buttons
SHORE:Edge of the sea
SKATE:Glide on ice
SLEEP:Rest at night
SLIDE:Playground chute
SLOTH:Very slow tree mammal
SNACK:Small bite between meals
SNAKE:Legless reptile
SPACE:The final frontier
SPOON:Used for soup
SQUID:Ten-armed sea creature
STAGE:Where actors perform
STAIR:One step in a flight
STEAM:Hot water vapour
STONE:Small rock
STOVE:Cooker
STRAW:Drinking tube
SUNNY:Bright with sunshine
SWAMP:Boggy land
TABLE:Furniture you eat at
TEETH:In your mouth
THEME:Main idea
THUMB:Short thick finger
TOAST:Grilled bread
TORSO:Body trunk
TRAIL:Path through woods
TREAT:Special reward
TRUCK:Large lorry
TULIP:Spring flower
UNCLE:Parent's brother
VIDEO:Recorded moving pictures
VIOLA:Larger violin
VISIT:Go to see
WAGON:Cart pulled by horses
WALTZ:Ballroom dance in three-time
WATER:H2O
WHALE:Largest ocean mammal
WHEAT:Grain for flour
WINDY:Breezy
WOMAN:Adult female
WRIST:Joint between hand and arm
YEAST:Makes bread rise
YIELD:Give way, or produce
ZESTY:Full of flavour
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
ALMOND:Oval nut
ANIMAL:Living creature
ANTLER:Deer's branched horn
APPEAR:Come into view
BADGER:Striped burrowing mammal
BAKERY:Shop that sells bread
BALLET:Graceful dance on tiptoe
BASKET:Woven carrier
BATTLE:Fight between armies
BEAVER:Dam-building rodent
BISHOP:Diagonal chess piece
BUTTER:Spread made from cream
BUTTON:Fastens a shirt
CARPET:Floor covering
CHEESE:Made from curdled milk
CHERRY:Small red stone fruit
CLOVER:Three-leaved plant
COCOON:Silk case of a caterpillar
COOKIE:Biscuit
COTTON:Soft plant fibre
CRAYON:Wax colouring stick
DONKEY:Long-eared beast of burden
DOODLE:Idle scribble
ELEVEN:One more than ten
FABRIC:Cloth
FERRET:Long slim pet that burrows
FIDDLE:Violin, or tinker
FLOWER:Blooms in a garden
FOSSIL:Ancient remains in rock
GARLIC:Pungent bulb for cooking
GINGER:Spicy root
GOBLIN:Small mischievous creature
GUITAR:Six-stringed instrument
HELMET:Head protection
HONEST:Truthful
INSECT:Six-legged creature
JACKET:Short coat
JIGSAW:Picture puzzle
KETTLE:Boils water
KITTEN:Young cat
LADDER:Climbed with rungs
LAPTOP:Portable computer
LIZARD:Scaly reptile
LOCKET:Pendant holding a photo
MAGNET:Attracts iron
MANTIS:Praying insect
MARBLE:Glass ball, or polished stone
MEDIUM:In the middle
MITTEN:Glove without fingers
MONKEY:Swinging primate
MUFFIN:Small cake
NAPKIN:Wipes your mouth at dinner
NEEDLE:Sewing point
NOODLE:Long thin pasta strip
OYSTER:Shellfish that can hold a pearl
PARROT:Talking bird
PEPPER:Spice, or a bell vegetable
PILLOW:Rest your head on it
POLICE:Law enforcers
PRINCE:King's son
PUPPET:Moved by strings or a hand
RACKET:Bat for tennis, or a din
RAISIN:Dried grape
REMOTE:Far away, or a TV clicker
SADDLE:Seat on a horse
SALMON:Pink fish that swims upstream
SHADOW:Dark shape cast by light
SHOVEL:Digging tool
SPIDER:Eight-legged web spinner
SPONGE:Soaks up water
SQUARE:Four equal sides
STATUE:Carved figure
STRING:Thin cord
SUNSET:Evening sky show
TABLET:Pill, or a flat computer
TEAPOT:Pours a hot brew
TENNIS:Racket sport
TIMBER:Wood for building
TOMATO:Red salad fruit
TROPHY:Cup for the winner
VIOLIN:Bowed string instrument
WALNUT:Wrinkly nut
WALRUS:Tusked Arctic mammal
WINDOW:Glass in a wall
YELLOW:Colour of a banana
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
ACROBAT:Tumbling circus performer
AIRPORT:Where planes land
ANTIQUE:Valuable old object
AVOCADO:Green fruit for guacamole
BALLOON:Inflated party decoration
BANDAGE:Covers a wound
BICYCLE:Two-wheeled pedal vehicle
BLANKET:Warm bed covering
BOOKEND:Holds books upright
CABBAGE:Leafy round vegetable
CARTOON:Animated film
CHAMBER:Room
CHICKEN:Clucking farm bird
CHIMNEY:Lets smoke out of a house
CITIZEN:Member of a nation
COCONUT:Hairy tropical nut
CONCERT:Live music show
CUPCAKE:Small iced cake
CUSTARD:Sweet egg sauce
DENTIST:Looks after teeth
EARRING:Ear jewellery
EXPLORE:Travel to discover
FACTORY:Building where goods are made
FEATHER:Covers a bird
FIREMAN:Puts out blazes
GALLERY:Room of art
GIRAFFE:Tallest animal
GLACIER:Slow river of ice
GORILLA:Largest ape
HAMSTER:Small cheek-pouched pet
HICCUPS:Sudden involuntary gulps
HOLIDAY:Time off
JACKPOT:Big win
KETCHUP:Tomato sauce
KITCHEN:Room for cooking
LETTUCE:Salad leaves
LOBSTER:Clawed red shellfish
MAILBOX:Letters go in it
MAMMOTH:Woolly ice-age elephant
MANSION:Huge house
MARACAS:Shaken percussion pair
MUSICAL:Show with songs
OATMEAL:Porridge
OSTRICH:Large flightless bird
PANCAKE:Flat breakfast cake
PENGUIN:Tuxedoed flightless bird
PICTURE:Image or photo
POPCORN:Cinema snack
PRESENT:Gift, or now
PUMPKIN:Orange Halloween squash
RACCOON:Masked bandit mammal
SANDBOX:Children's play pit
SCOOTER:Kick-powered ride
SHAMPOO:Hair wash
SPINACH:Leafy green vegetable
SUNBEAM:Ray of sunshine
TEACHER:Runs a classroom
TOOLBOX:Holds hammers and spanners
TRACTOR:Farm vehicle
TREETOP:Highest part of a tree
VAMPIRE:Bloodsucking creature of the night
VILLAGE:Small rural settlement
WETLAND:Marshy area
ZOOLOGY:Study of animals
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
