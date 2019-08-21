
const TymLogger = require("tymlogger");
const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const redux = require("redux");
const ip = require("ip");

const log = new TymLogger();

function reducer (state, action) {
    let newState = {...state};
    switch (action.type) {
        case "SET_DIRECTION":
            newState.direction = action.payload;

            return newState;

        case "POS_INCREMENT":
            switch (action.payload) {
                case "X":
                    if (newState.pos.x + 1 !== 7) {
                        newState.pos.x += 1;
                    }
                    return newState;

                case "Y":
                    if (newState.pos.y + 1 !== 12) {
                        newState.pos.y += 1;
                    }
                    return newState;
            }

        case "POS_DECREMENT":
            switch (action.payload) {
                case "X":
                    if (newState.pos.x - 1 !== -1) {
                        newState.pos.x -= 1;
                    }
                    return newState;

                case "Y":
                    if (newState.pos.y - 1 !== -1) {
                        newState.pos.y -= 1;
                    }
                    return newState;
            }

        case "SET_POSITION":
            log.write("redux set position...");
            newState.pos = action.payload;

            return newState;

        case "DAMAGE":
            newState.health = state.health - 1;

            return newState;

        case "SET_SKIN":
                log.write("redux set skin...");
                newState.skin = action.payload;
    
                return newState;

        case "SET_USER":
            log.write("redux set user...");
            newState.user = action.payload;

            return newState;
        
        default:
            log.write("new redux store init...");
            return newState;
    }
}

function main () {
    log.success(`GopWar Server v${require("../package.json").version}`);

    let connections = 0;

    app.get("/check", (req, res) => {
        log.write(`/check - connection from ${req.ip}`);
        if (connections >= 2) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send("battle");
        } else {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.send("ok");
        }
    });

    let map = [
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null]
    ];

    io.on("connection", (socket) => {
        let initialState = {
            user: null,
            skin: null,
            socket: socket,
            health: 10,
            pos: {
                x: null,
                y: null
            }
        };

        const userStore = redux.createStore(reducer, initialState);

        socket.on("authorize", (data) => {
            userStore.dispatch({ type: "SET_USER", payload: data.name });
            userStore.dispatch({ type: "SET_SKIN", payload: data.skin });
            
            if (connections < 1) {
                userStore.dispatch({ type: "SET_POSITION", payload: {
                    x: 3,
                    y: 1
                } });
                map[userStore.getState().pos.x][userStore.getState().pos.y] = {
                    name: userStore.getState().user,
                    skin: userStore.getState().skin,
                }
            } else {
                userStore.dispatch({ type: "SET_POSITION", payload: {
                    x: 3,
                    y: 10
                } });
                map[userStore.getState().pos.x][userStore.getState().pos.y] = {
                    name: userStore.getState().user,
                    skin: userStore.getState().skin,
                } 
            }

            connections++;

            log.write("connections - " + connections);

            if (connections === 2) {
                log.success("Game started!");
                socket.emit("started");
                socket.broadcast.emit("started");
            }

            log.write(`${userStore.getState().user} X=${userStore.getState().pos.x} Y=${userStore.getState().pos.y}`);

            socket.emit("health", userStore.getState().health);
            socket.emit("updateMap", map);
            socket.broadcast.emit("updateMap", map);
        });

        socket.on("damage", () => {
            log.write(`${userStore.getState().user} damaged! health: ${userStore.getState().health}0%`);

            socket.emit("health", userStore.getState().health);
            userStore.dispatch({ type: "DAMAGE" });
        });

        socket.on("lose", () => {
            log.success("Game ended!");

            connections = 0;

            socket.emit("endGame", userStore.getState().user);
            socket.broadcast.emit("endGame", userStore.getState().user);
        });

        socket.on("brick", () => {
            log.write(`${userStore.getState().user} attacks!`);

            let brickPosition = {
                x: null,
                y: null
            };

            switch (userStore.getState().direction) {
                case "TOP": 
                    brickPosition.x = userStore.getState().pos.x - 1;
                    brickPosition.y = userStore.getState().pos.y;

                    log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);

                    map[brickPosition.x][brickPosition.y] = "attack";

                    let topBrickInterval = setInterval(() => {
                        log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);

                        if (brickPosition.x !== 0) {
                            if (map[brickPosition.x - 1][brickPosition.y] !== null && map[brickPosition.x - 1][brickPosition.y] !== "attack") {
                                user = map[brickPosition.x - 1][brickPosition.y];

                                socket.broadcast.emit("damage", user.name);
                                socket.broadcast.emit("damageSound");

                                map[brickPosition.x][brickPosition.y] = null;
                                socket.emit("updateMap", map);
                                socket.broadcast.emit("updateMap", map);
                                
                                clearTopInterval();
                            } else {
                                let oldBrick = map[brickPosition.x][brickPosition.y];

                                map[brickPosition.x][brickPosition.y] = null;
                                brickPosition.x--;
                                map[brickPosition.x][brickPosition.y] = oldBrick;
    
                                socket.emit("updateMap", map);
                                socket.broadcast.emit("updateMap", map);   
                            }                      
                        } else {
                            map[brickPosition.x][brickPosition.y] = null;
                            socket.emit("updateMap", map);
                            socket.broadcast.emit("updateMap", map);
                            
                            clearTopInterval();
                        }  
                    }, 100);

                    function clearTopInterval () {
                        clearInterval(topBrickInterval);
                    }
                break;

                case "BOTTOM":
                        brickPosition.x = userStore.getState().pos.x + 1;
                        brickPosition.y = userStore.getState().pos.y;

                        log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);
    
                        map[brickPosition.x][brickPosition.y] = "attack";
    
                        let bottomBrickInterval = setInterval(() => {
                            log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);

                            if (brickPosition.x !== 6) {
                                if (map[brickPosition.x + 1][brickPosition.y] !== null && map[brickPosition.x + 1][brickPosition.y] !== "attack") {
                                    user = map[brickPosition.x + 1][brickPosition.y];
    
                                    socket.broadcast.emit("damage", user.name);
                                    socket.broadcast.emit("damageSound");
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);
                                    
                                    clearBottomInterval();
                                } else {
                                    let oldBrick = map[brickPosition.x][brickPosition.y];
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    brickPosition.x++;
                                    map[brickPosition.x][brickPosition.y] = oldBrick;
        
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);   
                                }                      
                            } else {
                                map[brickPosition.x][brickPosition.y] = null;
                                socket.emit("updateMap", map);
                                socket.broadcast.emit("updateMap", map);
                                
                                clearBottomInterval();
                            }  
                        }, 100);
    
                        function clearBottomInterval () {
                            clearInterval(bottomBrickInterval);
                        }
                break;

                case "LEFT":
                        brickPosition.x = userStore.getState().pos.x;
                        brickPosition.y = userStore.getState().pos.y - 1;

                        log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);
    
                        map[brickPosition.x][brickPosition.y] = "attack";
    
                        let leftBrickInterval = setInterval(() => {
                            log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);

                            if (brickPosition.y !== 0) {
                                if (map[brickPosition.x][brickPosition.y - 1] !== null && map[brickPosition.x][brickPosition.y - 1] !== "attack") {
                                    user = map[brickPosition.x][brickPosition.y - 1];
    
                                    socket.broadcast.emit("damage", user.name);
                                    socket.broadcast.emit("damageSound");
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);
                                    
                                    clearLeftInterval();
                                } else {
                                    let oldBrick = map[brickPosition.x][brickPosition.y];
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    brickPosition.y--;
                                    map[brickPosition.x][brickPosition.y] = oldBrick;
        
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);        
                                }                 
                            } else {
                                map[brickPosition.x][brickPosition.y] = null;
                                socket.emit("updateMap", map);
                                socket.broadcast.emit("updateMap", map);
                                
                                clearLeftInterval();
                            }  
                        }, 100);
    
                        function clearLeftInterval () {
                            clearInterval(leftBrickInterval);
                        }
                break;

                case "RIGHT":
                        brickPosition.x = userStore.getState().pos.x;
                        brickPosition.y = userStore.getState().pos.y + 1;

                        log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);
    
                        map[brickPosition.x][brickPosition.y] = "attack";
    
                        let rightBrickInterval = setInterval(() => {
                            log.write(`brick x=${brickPosition.x} y=${brickPosition.y}`);

                            if (brickPosition.y !== 11) {
                                if (map[brickPosition.x][brickPosition.y + 1] !== null && map[brickPosition.x][brickPosition.y + 1] !== "attack") {
                                    user = map[brickPosition.x][brickPosition.y + 1];
    
                                    socket.broadcast.emit("damage", user.name);
                                    socket.broadcast.emit("damageSound");
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);
                                    
                                    clearRightInterval();
                                } else {
                                    let oldBrick = map[brickPosition.x][brickPosition.y];
    
                                    map[brickPosition.x][brickPosition.y] = null;
                                    brickPosition.y++;
                                    map[brickPosition.x][brickPosition.y] = oldBrick;
        
                                    socket.emit("updateMap", map);
                                    socket.broadcast.emit("updateMap", map);
                                }                
                            } else {
                                map[brickPosition.x][brickPosition.y] = null;
                                socket.emit("updateMap", map);
                                socket.broadcast.emit("updateMap", map);
                                
                                clearRightInterval();
                            }  
                        }, 100);
    
                        function clearRightInterval () {
                            clearInterval(rightBrickInterval);
                        }
                break;
            }


            socket.emit("updateMap", map);
            socket.broadcast.emit("updateMap", map);      
            socket.emit("attack");
        });

        socket.on("move", (direction) => {
            log.write(`${userStore.getState().user} X=${userStore.getState().pos.x} Y=${userStore.getState().pos.y} : moved ${direction}`);

            let oldMapPosition = map[userStore.getState().pos.x][userStore.getState().pos.y];

            switch (direction) {
                case "TOP":
                    if (map[userStore.getState().pos.x - 1][userStore.getState().pos.y] === null) {
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = null;
                        userStore.dispatch({ type: "POS_DECREMENT", payload: "X" });
                        userStore.dispatch({ type: "SET_DIRECTION", payload: "TOP" });
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = oldMapPosition;
                        socket.emit("updateMap", map);
                        socket.broadcast.emit("updateMap", map);
                    }
                break;
            
                case "BOTTOM":
                    if (map[userStore.getState().pos.x + 1][userStore.getState().pos.y] === null) {
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = null;
                        userStore.dispatch({ type: "POS_INCREMENT", payload: "X" });
                        userStore.dispatch({ type: "SET_DIRECTION", payload: "BOTTOM" });
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = oldMapPosition;
                        socket.emit("updateMap", map);
                        socket.broadcast.emit("updateMap", map);
                    }
                break;

                case "LEFT":
                    if (map[userStore.getState().pos.x][userStore.getState().pos.y - 1] === null) {
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = null;
                        userStore.dispatch({ type: "POS_DECREMENT", payload: "Y" });
                        userStore.dispatch({ type: "SET_DIRECTION", payload: "LEFT" });
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = oldMapPosition;
                        socket.emit("updateMap", map);
                        socket.broadcast.emit("updateMap", map);
                    }
                break;
            
                case "RIGHT":
                    if (map[userStore.getState().pos.x][userStore.getState().pos.y + 1] === null) {
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = null;
                        userStore.dispatch({ type: "POS_INCREMENT", payload: "Y" });
                        userStore.dispatch({ type: "SET_DIRECTION", payload: "RIGHT" });
                        map[userStore.getState().pos.x][userStore.getState().pos.y] = oldMapPosition;
                        socket.emit("updateMap", map);
                        socket.broadcast.emit("updateMap", map);
                    }
                break;
            }
        });
    });

    http.listen(require("../settings.json").port, () => log.success("Started at " + ip.address() + ":" + require("../settings.json").port));
}

module.exports = main;
