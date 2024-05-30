const websocketUrl =
    "wss://01208753-ecf3-45d2-b9c1-4d1b11b42581-00-2plrhej7sxkl.worf.replit.dev:3001";

var socket = new WebSocket(websocketUrl);
var isAuthLogged = false;
var userName = "";
var token;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForConnection() {
    return new Promise((resolve, reject) => {
        if (socket.readyState === socket.OPEN) {
            resolve();
        } else {
            socket.addEventListener("open", resolve, { once: true });
            socket.addEventListener("error", reject, { once: true });
        }
    });
}

function waitForTokenAuth() {
    return new Promise((resolve, reject) => {
        function checkAuthLogged() {
            if (isAuthLogged) {
                resolve();
            } else {
                setTimeout(checkAuthLogged, 100);
            }
        }
        checkAuthLogged();
    });
}

socket.addEventListener("close", async function () {
    document.getElementById("overlay").classList.remove("hidden");
    while (socket.readyState !== socket.OPEN) {
        socket = new WebSocket(websocketUrl);
        try {
            await waitForConnection();
        } catch {
            console.log("Failed to reconnect, retrying...");
        }
    }
    document.getElementById("overlay").classList.add("hidden");
});

async function socketSendMessage(functionName, args = {}) {
    await waitForConnection();

    return new Promise((resolve, reject) => {
        const message = JSON.stringify({ function: functionName, args: args });

        function handle(event) {
            socket.removeEventListener("message", handle);
            resolve(JSON.parse(event.data));
        }

        socket.addEventListener("message", handle);
        socket.send(message);
    });
}

var btn = document.getElementById("logoutbtn");
btn.addEventListener("click", function (event) {
    event.preventDefault();
    logoutUser();
});

socket.addEventListener("open", async function () {
    if (localStorage.getItem("sessionToken")) {
        token = localStorage.getItem("sessionToken");
        socketSendMessage("tokenauth", { token: token }).then((response) => {
            console.log("Token authentication response:", response);
            if (!response.response) localStorage.clear();
            else {
                userName = response.response;
                document
                    .getElementById("welcomeList")
                    .classList.remove("hidden");
                document.getElementById("loginUrl").classList.add("hidden");
                document
                    .getElementById("profileUrl")
                    .classList.remove("hidden");
                document.getElementById("welcomeText").innerText =
                    "Welcome, " + userName + ".";
            }
        });
    }
    isAuthLogged = true;
});

async function loginUser(username, password) {
    var response = await socketSendMessage("login", {
        username: username,
        password: password,
    }).then(function (results) {
        if (results["response"].includes("-")) {
            localStorage.setItem("sessionToken", results["response"]);
            token = results["response"];
            console.log("Got session token: " + results["response"]);
        }
        return results;
    });
    return response;
}

async function registerUser(username, password) {
    var response = await socketSendMessage("register", {
        username: username,
        password: password,
    });
    return response;
}

async function logoutUser() {
    await waitForTokenAuth();
    await sleep(100);
    var response = await socketSendMessage("logout", {});
    window.location.replace(".");
    return response;
}

async function fetchLeaderboard(amount) {
    await waitForTokenAuth();
    await sleep(100);
    var response = await socketSendMessage("leaderboard", { amount: amount });
    return response;
}

async function fetchPlayerLeaderboard(amount) {
    await waitForTokenAuth();
    await sleep(100);
    var response = await socketSendMessage("pleaderboard", { amount: amount });
    return response;
}

async function fetchTotalStats() {
    await waitForTokenAuth();
    var response = await socketSendMessage("pstats", {});
    return response;
}
