const EventEmitter = require('events').EventEmitter;
const DEBUG = false;

class sessionsObserver  extends EventEmitter {
    constructor(neos){
        super();
        this.neos = neos;
        this.Priv_sessions = [];
        this.intervalId = null;
        this.ignore_emit = false;
    }

    observe(time, ignore_first = true) {
        if(ignore_first) {
            this.ignore_emit = true;
            this.CheckSessions();
        };
        if(this.intervalId == null) {
            this.intervalId = setInterval(() => {
                this.CheckSessions();
            }, time);
        }
        else {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.observe(time);
        }
    }

    CheckSessions() {
        this.neos.CloudXInterface.GetSessions().then(res => {
            let SessionInfos = res.Content;

            let newsessions = SessionInfos.filter((t) => {
                let found = false;
                this.Priv_sessions.forEach((pt) => {
                    if(t.SessionId == pt.SessionId) {
                        found = true;
                        return false;
                    }
                });
                return !found;
            });

            if(DEBUG && (newsessions.length != 0)) newsessions.forEach((e) => console.log(e.Name));

            this.Priv_sessions = SessionInfos;

            if(!this.ignore_emit){
                newsessions.forEach((element) => {
                        this.emit("detectNewTarget", element);
                    });
            }
            else{
                this.ignore_emit = false;
            }
        })
    }
}
module.exports = sessionsObserver;