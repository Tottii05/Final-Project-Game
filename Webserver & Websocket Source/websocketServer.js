const WebSocket = require("ws");
const databaseHandler = require("./database");

module.exports = class websocketServer {
    constructor(host = "0.0.0.0", port = 3001) {
        this.wss = new WebSocket.Server({ host: host, port: port });

        this.Database = new databaseHandler();

        this.wss.on("connection", (ws, req) => {
            console.log(
                `Started connection with client at ${ws._socket.remoteAddress}`,
            );

            var lastUser = { Name: "", IsGameClient: false, Token: "" };
            ws.on("message", (data) =>
                this.messageHandler(data.toString(), ws, lastUser),
            );
            ws.on("close", () => {
                if (lastUser.Name != undefined) {
                    if (lastUser.IsGameClient)
                        this.Database.matchEnded(lastUser.Name);
                    console.log(`[${lastUser.Name}] Disconnected.`);
                }
            });
        });

        console.log("Started websocket server at port ws://0.0.0.0:3001.");
    }

    async messageHandler(message, ws, lastUser) {
        message = JSON.parse(message);
        console.log(message);
        var response = { response: "" };
        switch (message["function"]) {
            case "tokenauth":
                response["response"] = await this.Database.tokenAuth(
                    message["args"]["token"],
                    message["args"]["isgame"],
                    lastUser,
                );
                break;
            case "login":
                response["response"] = await this.Database.login(
                    message["args"]["username"],
                    message["args"]["password"],
                    message["args"]["isgame"],
                    lastUser,
                );
                break;
            case "register":
                response["response"] = await this.Database.register(
                    message["args"]["username"],
                    message["args"]["password"],
                );
                break;
            case "logout":
                response["response"] = await this.Database.logout(
                    lastUser.Name,
                );
                break;
            case "newmatch":
                response["response"] = await this.Database.newMatch(
                    lastUser.Name,
                );
                break;
            case "updatematch":
                response["response"] = await this.Database.updateMatchStats(
                    lastUser.Name,
                    message["args"]["zombies"],
                    message["args"]["rounds"],
                    message["args"]["score"],
                );
                break;
            case "endmatch":
                response["response"] = await this.Database.matchEnded(
                    lastUser.Name,
                );
                break;
            case "leaderboard":
                response["response"] = await this.Database.getTop10(
                    message["args"]["amount"],
                );
                break;
            case "pleaderboard":
                response["response"] = await this.Database.getTopPersonal10(
                    lastUser.Name,
                    message["args"]["amount"],
                );
                break;
            case "pstats":
                response["response"] = await this.Database.getPersonalStats(
                    lastUser.Name,
                );
                console.log(response.response);
                break;
        }
        ws.send(JSON.stringify(response));
    }
};
