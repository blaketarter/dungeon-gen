let dung = {
  tiles: [],
  rooms: [],
};

let player = {};
let game = {
  over: 0,
  score: 0,
  level: 10,
};

function randomBetween(min,max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const TOTAL_PIXELS = 256;
// const TOTAL_PIXELS = 128;
const SPRITE_SIZE = 8;

// const TOTAL_PIXELS = 1024;
// const SPRITE_SIZE = 8;

const OBJ_CHANCE = 0.02;

const groundTypes = ['GROUND', /*'GROUND_2',*/ 'LAVA', /*'DIRT'*/];
const blockDesc = {
  GROUND: {
    color: '#666666',
  },
  GROUND_2: {
    color: '#566778',
  },
  BURNT_GROUND: {
    color: '#555555',
  },
  LAVA: {
    color: '#FF5722',
  },
  DIRT: {
    color: '#795548',
  },
  WALL: {
    color: '#333333',
  },
  WALL_2: {
    color: '#224444',
  },
  ROOM_FLOOR: {
    color: '#566778',
  },
  DOOR: {
    color: '#795548',
  },
  CHEST: {
    color: '#FB0',
  }
};

const roomTypes = ['CHEST', 'BOSS', 'STAIRS'];

function generateMap() {
  const rowLength = TOTAL_PIXELS / SPRITE_SIZE;
  const blocks = rowLength ** 2;

  let dungeon = [];
  let rooms = [];

  let room = {
    x: 0,
    y: 0,
    height: 0,
    width: 0,
    type: null,
    door: null,
    walls: [],
  };
  
  let block = {
    x: 0,
    y: 0,
    blockType: groundTypes[0],
    occupied: false,
    occupent: null,
    hasItem: false,
    item: false,
    isDoor: false,
    doorID: null,
    isWall: false,
  };

  function generateFloor() {
    let xCoord = 0;
    let yCoord = 0;

    for (let i = 0, ii = blocks; i < ii; i++) {
      dungeon.push(Object.assign({}, block, {}));

      dungeon[i].x = xCoord;
      dungeon[i].y = yCoord;

      if (xCoord < TOTAL_PIXELS - SPRITE_SIZE) {
        xCoord += SPRITE_SIZE;
      } else {
        xCoord = 0;
        yCoord += SPRITE_SIZE;
      }
    }
  }

  function makeLavaPool(size, startIndex) {
    let directions = [1, rowLength, -1, -rowLength];
    let stretch = -1;
    let currentIndex = startIndex;
    let blockType = 'BURNT_GROUND';

    if (Math.random() > 0.5) {
      directions = directions.reverse();
    }

    if (Math.random() < (0.05 * (game.level + 1))) {
      blockType = 'LAVA';
    }

    while (size > 0) {
      let run = (stretch < 1) ? 1 : stretch;
      let direction = directions[0];
      directions.push(directions.shift());

      for (let i = 0, ii = run; i < ii; i++) {

        if ((size > 0) && dungeon[currentIndex]) {
          dungeon[currentIndex].blockType = blockType;
          currentIndex += direction;
        }

        size--;
      }

      stretch++;
    }
  }

  function addFloorFlavor() {
    // todo add different size flavor patches
    for (let i = 0, ii = blocks; i < ii; i++) {
      if (Math.random() <= (OBJ_CHANCE * (game.level + 1))) {
        let poolSize = randomBetween(1, (game.level + 5));
        // console.log('poolSize ' + poolSize);
        makeLavaPool(poolSize, i);
      }
    }
  }

  function generateWalls() {
    const firstWall = Math.floor(Math.random() * dungeon.length);
    const directions = [rowLength, -rowLength, -1, 1];
    const direction = directions[Math.floor(Math.random() * directions.length)];

    let wallIndex = firstWall;

    for (let i = 0, ii = 5; i < ii; i++) {
      if (!dungeon[wallIndex]) {
        break;
      }

      dungeon[wallIndex].isWall = true;
      dungeon[wallIndex].blockType = 'WALL_2';
      wallIndex += direction;
    }
  }

  function generateRoom(roomOpts, regenAttempt) {
    const directions = [1, -rowLength, -1, rowLength];
    let wallIndex = roomOpts.startIndex;

    let rowNumber = Math.floor(wallIndex / rowLength);
    let columnNumber = (wallIndex - (rowNumber * rowLength));

    if (!regenAttempt) {
      regenAttempt = 0;
    }

    if (regenAttempt > 5) {
      console.warn('too many regen attempts, stopping');
      return null;
    }

    function checkIfRoomIntersects(thisRoom, otherRoom) {
      return !(
        otherRoom.left > thisRoom.right || 
        otherRoom.right < thisRoom.left || 
        otherRoom.top > thisRoom.bottom ||
        otherRoom.bottom < thisRoom.top
      );
    }

    function arrayDifference(arr1, arr2) {
      return arr1.filter(i => arr2.indexOf(i) < 0);
    }

    function findCornerWalls(room) {
      let corners = [];

      let height = room.height;
      let width = room.width;
      
      corners.push(room.walls[0]);
      corners.push(room.walls[width]);
      corners.push(room.walls[width + height]);
      corners.push(room.walls[width + height + width]);

      return corners;
    }

    // too close to Right check
    if (columnNumber + roomOpts.width >= (rowLength - 1)) {
      wallIndex -= (((columnNumber + roomOpts.width) - rowLength) + 2);
    }

    columnNumber = (wallIndex - (rowNumber * rowLength));

    //left check
    if (columnNumber === 0) {
      wallIndex += 1;
    }

    columnNumber = (wallIndex - (rowNumber * rowLength));

    // too close to Top check
    if (rowNumber - roomOpts.height < 1) {
      wallIndex += (((Math.abs((rowNumber - roomOpts.height) - 1)) * rowLength));
    }

    rowNumber = Math.floor(wallIndex / rowLength);

    //bottom check
    if (rowNumber === (rowLength - 1)) {
      wallIndex -= rowLength;
    }

    rowNumber = Math.floor(wallIndex / rowLength);

    roomOpts.originalStartIndex = roomOpts.startIndex;    
    roomOpts.startIndex = wallIndex;

    roomOpts.location = {
      top: rowNumber - roomOpts.height - 1,
      left: columnNumber,
      right: columnNumber + roomOpts.width + 1,
      bottom: rowNumber,
    };

    let roomIntersects = false;

    //intersect other rooms check
    if (rooms.length) {
      for (let room of rooms) {
        if (checkIfRoomIntersects(roomOpts.location, room.location)) {
          roomIntersects = true;

          if (roomIntersects) {
            break;
          }
        }
      }
    }

    if (roomIntersects) {
      return generateRoom({
        startIndex: Math.floor(Math.random() * dungeon.length),
        height: randomBetween(5, (10 - regenAttempt)),
        width: randomBetween(5, (10 - regenAttempt)),
      }, ++regenAttempt);
    }

    let floorIndex = (wallIndex + 1) - rowLength;
    let hasDoor = false;
    let doorChance = 1 / ((roomOpts.height * 2) + (roomOpts.width * 2));

    roomOpts.walls = [];
    roomOpts.floors = [];

    // make room walls
    for (let d = 0, dd = directions.length; d < dd; d++) {
      for (let i = 0, ii = ((d === 0 || d === 2) ? roomOpts.width : roomOpts.height); i < ii; i++) {
        if (!dungeon[wallIndex]) {
          // continue;
        } else {

          dungeon[wallIndex].isWall = true;
          dungeon[wallIndex].blockType = 'WALL';

          roomOpts.walls.push(dungeon[wallIndex]);
        }

        wallIndex += directions[d];
      }
    }
    
    // make room floor
    for (let r = 0, rr = roomOpts.height - 2; r <= rr; r++) {
      for (let i = 0, ii = roomOpts.width - 2; i <= ii; i++) {
        if (!dungeon[floorIndex]) {
          // continue;
        } else {

          dungeon[floorIndex].blockType = 'GROUND_2';

          roomOpts.floors.push(dungeon[floorIndex]);
        }

        floorIndex += 1;
      }

      floorIndex -= (roomOpts.width - 1);
      floorIndex -= rowLength;
    }

    // place CHEST
    if (roomOpts.floors.length) {
      let chestIndex = (roomOpts.startIndex + (Math.floor(roomOpts.width / 2) - (Math.floor(roomOpts.height / 2) * rowLength)));

      if (dungeon[chestIndex]) {
        roomOpts.chest = dungeon[chestIndex];
        roomOpts.chest.blockType = 'CHEST';
      }
    }

    // place door
    // todo make sure to remove all lava directly in front of door
    let corners = findCornerWalls(roomOpts);
    let possibleDoors = arrayDifference(roomOpts.walls, corners);

    if (possibleDoors.length) {
      roomOpts.door = possibleDoors[Math.floor(Math.random() * possibleDoors.length)];
      roomOpts.door.isWall = false;
      roomOpts.door.isDoor = true;
      roomOpts.door.doorID = roomOpts.roomID;
      roomOpts.door.blockType = 'DOOR';
    }

    rooms.push(roomOpts);

    return roomOpts;
  }

  generateFloor();
  addFloorFlavor();

  let numberOfRoomAttempts = game.level + 1;

  for (let i = 0, ii = numberOfRoomAttempts; i < ii; i++) {
    generateWalls();
  }
  

  for (let i = 0, ii = numberOfRoomAttempts; i < ii; i++) {
    generateRoom({
      startIndex: Math.floor(Math.random() * dungeon.length),
      height: randomBetween(5, 10),
      width: randomBetween(5, 10),
    });
  }

  dung.rooms = rooms;
  dung.tiles = dungeon;

  return dungeon;
}

function end() {
  game.over = 1;
}

let mapNode = document.getElementById('dungeon');

let blockId = 0;

function makeBlock(blockOpts) {
  let block = document.createElement('div');

  block.style.top = blockOpts.y + 'px';
  block.style.left = blockOpts.x + 'px';
  block.style.height = SPRITE_SIZE + 'px';
  block.style.width = SPRITE_SIZE + 'px';
  block.style.position = 'absolute';
  block.style.background = blockDesc[blockOpts.blockType].color;
  block.className = 'block ' + blockOpts.blockType.toLowerCase();
  block.id = 'block-' + blockId++;

  return block;
}

function render() {
  while (mapNode.firstChild) {
    mapNode.removeChild(mapNode.firstChild);
  }

  dung.tiles.forEach((block) => {
    mapNode.appendChild(makeBlock(block));
  });
}

function tick() {}

function loop() {
  if (game.over === 1) {
    return;
  }
  
  console.log(dung);

  render();
  
  // window.requestAnimationFrame(loop);
}


dung.tiles = generateMap();
window.requestAnimationFrame(loop);

// setTimeout(end, 15000);