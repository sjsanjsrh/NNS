const Neos = require('@bombitmanbomb/neosjs');
const sessionsObserver = require('./SessionsObserver.js');
const neos = new Neos();
const alias = require("./alias.json")
const so = new sessionsObserver(neos, alias['newbie-kr']);
const { Client, GatewayIntentBits, Partials, EmbedBuilder ,ActivityType} = require('discord.js');
const config = require("./config.json")
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.GuildMessageReactions,
    ], partials: [
        Partials.GuildMember,
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});
const targetMap = require("./targetMap.json")
const fs = require("fs");
const { debug } = require('console');
_targetMap = { ...targetMap };
const EventEmitter = require('events').EventEmitter;
const commend = new EventEmitter();
const DEBUG = config.debug.core;

const undefind_msg = "You did not add a session name"

function listToString(list, p) {
    let res = "";
    list.forEach(e => {
        res += e + p;
    })
    return res.slice(0, -p.length);
}

function targetMapArgsInit(a){
    return {mute: false, list: a}
}

function addTargetMap(user, arg) {
    let res = [];
    arg.forEach((a) => {
        if (a != "") {
            if (user in _targetMap) {
                if (!(_targetMap[user].list.includes(a))) {
                    _targetMap[user].list.push(a);
                    res.push(a);
                }
            }
            else {
                _targetMap[user] = targetMapArgsInit([a]);
                res = [a]
            }
        }
    });

    fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));

    return res;
}

function removeTargetMap(user, arg) {
    let res = [];
    if (user in _targetMap) {
        if (arg.length > 0) {
            arg.forEach((a) => {
                let i = _targetMap[user].list.findIndex(e => e == a)
                if (i != -1) {
                    _targetMap[user].list.splice(i, 1);
                    res.push(a);
                    if (!(_targetMap[user].list[0])) {
                        delete _targetMap[user];
                        return false;
                    }
                }
            });
        }
        else {
            res = [..._targetMap[user].list];
            delete _targetMap[user];
        }
    }

    fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));

    return res;
}

function addUser(user, arg) {
    let res = [];
    if (!arg[0])
        return res;
    arg.forEach((al) => {
        if (al in alias) {
            if (user in _targetMap) {
                let r = addTargetMap(user, alias[al]);
                res = res.concat(r);
            }
            else {
                _targetMap[user] = targetMapArgsInit(alias[al]);
                res = [...alias[al]];
                
                fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));
            }
        }
    });

    return res;
}
function removeUser(user, arg) {
    let res = [];
    if (!arg[0])
        res = removeTargetMap(user, []);

    arg.forEach((al) => {
        if (al in alias) {
            if (user in _targetMap) {
                let r = removeTargetMap(user, alias[al])
                res = [...res, ...r];
            }
        }
    });

    return res;
}

neos.on("login", (obj) => {
    console.log("login");
    if (DEBUG) console.log(obj);
    so.observe(3000);
});

function sendSessionInfo(userid, session) {
    client.users.fetch(userid, false).then((user) => {
        neos.GetUser(session.HostUserId).then(async (Neosuser) => {
            let icon = Neosuser.Profile.IconUrl ?
                neos.NeosDBToHttp(Neosuser.Profile.IconUrl, null) :
                "https://upload.wikimedia.org/wikipedia/commons/5/55/Neos_VR_Logo.png";
            let sessionName = session.Name;
            let userName = session.HostUsername;
            let thumbnail = session.Thumbnail ?
                neos.NeosDBToHttp(session.Thumbnail, null) :
                "https://upload.wikimedia.org/wikipedia/commons/5/55/Neos_VR_Logo.png";
            let time = session.SessionBeginTime;
            let urls = "";
            urls = "http://cloudx.azurewebsites.net/open/session/"+session.SessionId;
            let sessionUsers = session.SessionUsers;
            let msg = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(sessionName)
                .setAuthor({ name: userName, iconURL: icon })
                .setDescription(urls)
                .setThumbnail(thumbnail)
                .setTimestamp(new Date(time))
            try {
                await user.send({ embeds: [msg] });
            } catch (error) {
                if (DEBUG) console.error(error);
            }
        });
    });
}

so.on("detectNewTarget", (session) => {
    //if(DEBUG)console.log(session);

    for (userid in _targetMap) {
        let t = _targetMap[userid];
        if ((!t.mute) && (t.list.includes(session.Name))) {
            sendSessionInfo(userid, session);
        }
    }
});

client.on('ready', () => {
    let res = client.user.setActivity("DM '/help' for help",{
        type: ActivityType.Custom
    });
    if(DEBUG)console.log(res);

    console.log(`Logged in as ${client.user.tag}!`);

    // client.guilds.fetch('1003099200453607526').then((guild)=>{
    //     guild.members.fetch().then((members)=>{
    //         console.log(members);
    //     });
    // });
});

client.on("messageCreate", message => {
    if (message.author.id != client.user.id) {
        if (message.content.length > 0) {
            if (message.content.charAt(0) == "/") {
                let arg = message.content.substr(1).split(" ");
                arg = arg.filter((e) => e != '');
                if (arg.length > 0) {
                    if (DEBUG) console.log(message.author.tag + " : " + message.content);
                    commend.emit(arg[0], arg, message);
                }
            }
        }
    }
});

function reply_help_alias(arg, message) {
    let msg = new EmbedBuilder()
        .setColor(0x0000ff).
        setDescription(`\`\`\`/${arg[0]} ${arg[1]} [ ${listToString(Object.keys(alias), " | ")} ]\`\`\``);
    for (key in alias) {
        msg.addFields({ name: key, value: listToString(alias[key], "\n"), inline: true })
    }
    message.reply({ embeds: [msg] });
}

commend.on("list", (arg, message) => {
    message.author.id in _targetMap ?
        message.reply("\`" + JSON.stringify(_targetMap[message.author.id]) + "\`") :
        message.reply(undefind_msg);

})

function try_reply_help(arg, message){
    let found = false;
    arg.forEach(e => {
        if (e in alias) {
            found = true;
            return false;
        }
    });

    if (!found) {
        reply_help_alias(arg, message);
        return true;
    }
    return false;
}

const option = /^-[^s-]$/;

commend.on("add", (arg, message) => {
    helpmsg = `
/${arg[0]} <session name>   : add list <session name>
/${arg[0]} -l <alias>       : type '/${arg[0]} -l' is help.
/${arg[0]} -j <json>        : add list json array
`
    let res;
    let user = message.author.id;
    if (option.test(arg[1])) {
        if (arg[1] == "-l") {
            res = addUser(user, arg.slice(2));

            if ((res.length <= 0)) {
                if(try_reply_help(arg, message))return;
            }
        }
        else if (arg[1] == "-j") {
            let opt = "-j"
            let pos = message.content.indexOf(opt) + opt.length + 1;
            let str = message.content.slice(pos, message.content.length)
            let list = Array.from(JSON.parse(str));
            if(list[0]) res = addTargetMap(user, list);
            
        }
        else {
            message.reply("\`\`\`"+helpmsg+"\`\`\`");
            return;
        }
    }
    else {
        let str = message.content.slice(arg[0].length + 2, message.content.length)
        if(str == ""){
            message.reply("\`\`\`"+helpmsg+"\`\`\`");
            return;
        }
        else{
            res = addTargetMap(user, [str]);
        }
    }

    message.reply("added: `" + JSON.stringify(res) + "`");
    console.log(message.author.tag + "->added: " + JSON.stringify(res));
});

commend.on("rm", (arg, message) => {
    helpmsg = `
/${arg[0]} -a               : remove all
/${arg[0]} <session name>   : remove session name in list
/${arg[0]} -l <alias>       : type '/${arg[0]} -l' is help.
/${arg[0]} -j <json>        : remove json array in list
`
    let res;
    let user = message.author.id;
    if (option.test(arg[1])) {
        if (arg[1] == "-a") {
            res = removeUser(user, []);
        }
        else if (arg[1] == "-l") {
            if(arg[2]){
                res = removeUser(user, arg.slice(2));
            }
            else{
                if(try_reply_help(arg, message))return;
            }
        }
        else if (arg[1] == "-j") {
            let opt = "-j"
            let pos = message.content.indexOf(opt) + opt.length + 1;
            let str = message.content.slice(pos, message.content.length)
            let list = Array.from(JSON.parse(str));
            if(list[0]) res = removeTargetMap(user, list);
        }
        else {
            message.reply("\`\`\`"+helpmsg+"\`\`\`");
            return;
        }
    }
    else{
        let str = message.content.slice(arg[0].length + 2, message.content.length)
        if(str == ""){
            message.reply("\`\`\`"+helpmsg+"\`\`\`");
            return;
        }
        else{
            res = removeTargetMap(user, [str]);
        }
    }

    message.reply("removed: `" + JSON.stringify(res) + "`");
    console.log(message.author.tag + "->removed: " + JSON.stringify(res));
});

commend.on("help", (arg, message) => {
    helpmsg = `
/add        : add session name
/rm         : remove session name in list
/list       : display list of session name
/mute       : stop sending messages
/unmute     : resume sending messages
`
    message.reply("\`\`\`"+helpmsg+"\`\`\`");
});

commend.on("mute", (arg, message) => {
    let user = message.author.id;
    if (user in _targetMap) {
        _targetMap[user].mute = true;
        fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));
        message.reply("Stop sending messages");
    }
    else{
        message.reply(undefind_msg);
    }
});
commend.on("unmute", (arg, message) => {
    let user = message.author.id;
    if (user in _targetMap) {
        _targetMap[user].mute = false;
        fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));
        message.reply("Resume sending messages");
    }
    else{
        message.reply(undefind_msg);
    }
});

client.login(config.Discord.token);
neos.Login(config.Neos.id, config.Neos.pw);
