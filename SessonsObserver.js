const EventEmitter = require('events').EventEmitter;
const DEBUG = false;

class SessonsObserver  extends EventEmitter {
    constructor(neos){
        super();
        this.neos = neos;
        this.Priv_sessons = [];
        this.intervalId = null;
        this.ignore_emit = false;
    }

    observe(time, ignore_first = true) {
        if(ignore_first) {
            this.ignore_emit = true;
            this.CheckSessons();
        };
        if(this.intervalId == null) {
            this.intervalId = setInterval(() => {
                this.CheckSessons();
            }, time);
        }
        else {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.observe(time);
        }
    }

    CheckSessons() {
        this.neos.CloudXInterface.GetSessions().then(res => {
            let SessionInfos = res.Content.filter((t) => {
                return t.ActiveUsers.length != 0;
            });;

            let newSessons = SessionInfos.filter((t) => {
                let found = false;
                this.Priv_sessons.forEach((pt) => {
                    if(t.SessionId == pt.SessionId) {
                        found = true;
                        return false;
                    }
                });
                return !found;
            });

            if(DEBUG && (newSessons.length != 0)) newSessons.forEach((e) => console.log(e.Name));

            this.Priv_sessons = SessionInfos;

            if(!this.ignore_emit){
                newSessons.forEach((element) => {
                        this.emit("detectNewTarget", element);
                    });
            }
            else{
                this.ignore_emit = false;
            }
        })
    }
}
module.exports = SessonsObserver;
