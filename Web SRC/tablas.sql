CREATE TABLE IF NOT EXISTS Users  (
    userName varchar(32) PRIMARY KEY,
    passWord varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS Matches (
    matchId Serial PRIMARY KEY,
    userName varchar(32) NOT NULL,
    zombiesKilled int DEFAULT 0,
    roundsSurvived int DEFAULT 0,
    score int DEFAULT 0,
    finished boolean DEFAULT false,
    CONSTRAINT fk_user
      FOREIGN KEY(userName) 
        REFERENCES Users(userName)
);