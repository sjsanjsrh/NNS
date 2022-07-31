const EventEmitter = require('events').EventEmitter;
const DEBUG = true;

class SessonsObserver  extends EventEmitter {
    constructor(neos, target_name){
        super();
        this.neos = neos;
        this.target_name = target_name;
        this.Priv_sessons = [];
        this.intervalId = null;
    }

    observe(time, ignore_first = true) {
        if(ignore_first) {
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
            let SessionInfos = res.Content;

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

            newSessons.forEach((element) => {
                this.target_name.forEach((tn) => {
                    if(element.Name == tn) {
                        this.emit("detectNewTarget", element);
                        return false;
                    }
                });
            });
        })
    }
}
module.exports = SessonsObserver;