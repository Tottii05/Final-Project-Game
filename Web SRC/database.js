const { Client } = require("pg");
const bcrypt = require("bcrypt");

module.exports = class databaseHandler {
    constructor() {
        this.sessionTokens = [];

        this.Client = new Client({
            user: "gljbxfth",
            password: "3NV-j5t_O7E2UFnp4kdqxu2myK0fwgP0",
            host: "tai.db.elephantsql.com",
            port: "5432",
            database: "gljbxfth",
        });

        (async function (client) {
            try {
                await client.connect();
                console.log("Database connection initiated.");
            } catch (e) {
                console.log("Could not connect to database.");
                console.log(e);
            }
        })(this.Client);
    }

    async generateRandomString() {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}`;
    }

    async newMatch(user) {
        const res = await this.Client.query(
            "INSERT INTO Matches (userName) VALUES ($1) RETURNING matchId",
            [user],
        );
        return res.rows[0].matchid;
    }

    async tokenAuth(token, isgame, lastuserptr) {
        if (isgame) lastuserptr.IsGameClient = true;
        var result = this.sessionTokens.find((val, idx) => {
            if (val.token == token) {
                lastuserptr.Token = token;
                return true;
            }
        });
        if (result) {
            console.log(
                `[${result.user}] Logged in using a session token. (${token})`,
            );
            lastuserptr.Name = result.user;
            return result.user;
        } else {
            return false;
        }
    }

    async login(user, pass, isgame, lastuserptr) {
        if (isgame) lastuserptr.IsGameClient = true;
        const specialCharRegex = /[^a-zA-Z0-9_]/;
        if (specialCharRegex.test(user)) {
            console.log(
                `[${user}] Login failed. Username contains special characters.`,
            );
            return "Username must not contain special characters.";
        }
        const res = await this.Client.query(
            "SELECT passWord FROM Users WHERE userName=$1",
            [user],
        );
        if (res.rowCount > 0) {
            if (bcrypt.compareSync(pass, res.rows[0].password)) {
                var tkn = await this.generateRandomString();
                console.log(`[${user}] Logged in using password. (${tkn})`);
                lastuserptr.Name = user;
                var sessionObject = { token: tkn, user: user };
                this.sessionTokens.push(sessionObject);
                return sessionObject.token;
            }
        }
        return "User does not exist.";
    }

    async register(user, pass) {
        try {
            const specialCharRegex = /[^a-zA-Z0-9_]/;
            const passregex =
                /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/;
            if (specialCharRegex.test(user)) {
                console.log(
                    `[${user}] Register failed. Username contains special characters.`,
                );
                return "Username must not contain special characters.";
            }
            if (user.length < 3) {
                console.log(
                    `[${user}] Register failed. Username is less than 3 letters long.`,
                );
                return "Username must be 3+ characters long.";
            }
            if (passregex.test(pass)) {
                console.log(
                    `[${user}] Register failed. Password must contain: 1 min, 1 may, 1 spec char, min 8 digits.`,
                );
                return "Register failed. Password must contain: 1 min, 1 may, 1 spec char, min 8 digits.";
            }
            const hash = bcrypt.hashSync(pass, 10);
            const res = await this.Client.query(
                "INSERT INTO Users (userName, passWord) VALUES ($1, $2)",
                [user, hash],
            );
            return "User registered successfully!";
        } catch {
            return "Error.";
        }
    }

    async logout(lastuserptr) {
        try {
            const index = this.sessionTokens.indexOf({
                token: lastuserptr.Token,
                user: lastuserptr.Name,
            });
            this.sessionTokens.splice(index, 1);
        } catch {
            return "Error.";
        }
    }

    async userExists(username) {
        const res = await this.Client.query(
            "SELECT COUNT(*) FROM Users WHERE userName = $1",
            [username],
        );
        return parseInt(res.rows[0].count) > 0;
    }

    async newMatch(user) {
        try {
            this.matchEnded(user);
            const query =
                "INSERT INTO Matches (userName) VALUES ($1) RETURNING matchId";
            const res = await this.Client.query(query, [user]);
            return res.rows[0].matchid;
        } catch {
            return -1;
        }
    }
    async updateMatchStats(
        username,
        zombiesKilled = 0,
        roundsSurvived = 0,
        score = 0,
    ) {
        const subquery = `
            SELECT matchId
            FROM Matches
            WHERE userName = $4
            ORDER BY matchId DESC
            LIMIT 1
        `;
        const query = `
            UPDATE Matches
            SET zombiesKilled = $1, roundsSurvived = $2, score = $3
            WHERE matchId = (${subquery}) AND finished = false
        `;
        const values = [zombiesKilled, roundsSurvived, score, username];
        const res = await this.Client.query(query, values);
        return res.rowCount > 0;
    }

    async matchEnded(username) {
        const subquery = `
            SELECT matchId
            FROM Matches
            WHERE userName = $1
            ORDER BY matchId DESC
            LIMIT 1
        `;
        const query = `
            UPDATE Matches
            SET finished = true
            WHERE matchId = (${subquery}) AND finished = false
        `;
        const values = [username];
        const res = await this.Client.query(query, values);
        return res.rowCount > 0;
    }

    async getTop10(amount) {
        const res = await this.Client.query(
            "SELECT * FROM Matches GROUP BY matchId ORDER BY roundsSurvived DESC LIMIT $1",
            [amount],
        );
        return res.rows;
    }

    async getTopPersonal10(username, amount) {
        const res = await this.Client.query(
            "SELECT * FROM Matches WHERE username=$1 GROUP BY matchId ORDER BY matchId DESC LIMIT $2",
            [username, amount],
        );
        return res.rows;
    }

    async getPersonalStats(username) {
        var responseObject = {
            GamesPlayed: 0,
            TotalRounds: 0,
            ZombiesKilled: 0,
            TotalScore: 0,
        };
        const res = await this.Client.query(
            "SELECT COUNT(matchId) AS GamesPlayed, SUM(roundsSurvived) AS TotalRounds, SUM(zombiesKilled) AS ZombiesKilled, SUM(score) AS TotalScore FROM Matches WHERE username=$1",
            [username],
        );
        if (res.rows.length > 0) {
            responseObject.GamesPlayed = parseInt(res.rows[0].gamesplayed);
            responseObject.TotalRounds = parseInt(res.rows[0].totalrounds);
            responseObject.ZombiesKilled = parseInt(res.rows[0].zombieskilled);
            responseObject.TotalScore = parseInt(res.rows[0].totalscore);
        }
        return responseObject;
    }
};
