const Neos = require('@bombitmanbomb/neosjs');
const SessonsObserver = require('./SessonsObserver.js');
const neos = new Neos();
const alias = require("./alias.json")
const so = new SessonsObserver(neos, alias['newbie-kr']);
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const config = require("./config.json")
const client = new Client({ intents: [
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
    ] });
const targetMap = require("./targetMap.json")
const fs = require("fs")
_targetMap = {...targetMap};
const EventEmitter = require('events').EventEmitter;
const commend = new EventEmitter();
const DEBUG = false;

function listToString(list, p){
    let res = "";
    list.forEach(e => {
        res += e+p;
    })
    return res.slice(0, -p.length);
}

function addUser(user, arg){
    let res = [];
    if(!arg[0])
        return res;
    arg.forEach((al) => {
        if(al in alias){
            if(user in _targetMap){
                if(!_targetMap[user].includes(al)){
                    _targetMap[user].push(al);
                }
                res.push(al);
            }
            else{
                _targetMap[user] = [al];
                res.push(al);
            }
        }
    });
    fs.writeFileSync("./targetMap.json", JSON.stringify(_targetMap));
    
    return res;
}
function removeUser(user, arg){
    let res = [];
    if(user in _targetMap){
        if(arg.length > 0){
            arg.forEach((al) => {
                let i = _targetMap[user].findIndex(e => e==al)
                if(i != -1){
                    _targetMap[user].splice(i, 1);;
                    res.push(al);
                }
            });
        }
        else{
            res = [..._targetMap[user]];
            delete _targetMap[user];
        }
    }
    fs.writeFileSync("./targetMap.json", JSON.stringify(Array.from(_targetMap)));

    return res;
}

neos.on("login",(obj) => {
    console.log("login");
    if(DEBUG)console.log(obj);
    so.observe(3000);
});

function  sendSessonInfo(userid, sesson){
    client.users.fetch(userid, false).then((user) => {
        neos.GetUser(sesson.HostUserId).then(async (Neosuser) => {
            let icon = Neosuser.Profile.IconUrl ?
                neos.NeosDBToHttp(Neosuser.Profile.IconUrl, null) : 
                "https://upload.wikimedia.org/wikipedia/commons/5/55/Neos_VR_Logo.png";
            let sessonName = sesson.Name;
            let userName = sesson.HostUsername;
            let thumbnail = sesson.Thumbnail ? 
                neos.NeosDBToHttp(sesson.Thumbnail, null) : 
                "https://upload.wikimedia.org/wikipedia/commons/5/55/Neos_VR_Logo.png";
            let time = sesson.SessionBeginTime;
            let urls = "";
            sesson.SessionURLs.forEach((url) => urls += "```"+url + "```\n");
            let msg = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle(sessonName)
                .setAuthor({ name: userName, iconURL: icon})
                .setDescription(urls)
                .setThumbnail(thumbnail)
                .setTimestamp(new Date(time))
                try {
                    await user.send({ embeds: [msg]});
                } catch (error) {
                    if(DEBUG)console.error(error);
                }
        });
    });
}

so.on("detectNewTarget",(sesson) => {
    //if(DEBUG)console.log(sesson);

    for(al in alias){
        alias[al].forEach((tname) => {
            if(tname == sesson.Name){
                for(userid in _targetMap){
                    if(_targetMap[userid].includes(al))
                    {
                        sendSessonInfo(userid, sesson);
                    }
                }
            }
        });
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // client.guilds.fetch('1003099200453607526').then((guild)=>{
    //     guild.members.fetch().then((members)=>{
    //         console.log(members);
    //     });
    // });
});

client.on("messageCreate", message => {
    if(message.author.id != client.user.id)
    {
        if(message.content.length > 0){
            if(message.content.charAt(0) == "/")
            {
                let arg = message.content.substr(1).split(" ");
                arg = arg.filter((e) => e != '');
                if(arg.length > 0){
                    if(DEBUG)console.log(message.author.tag+" : "+message.content);
                    commend.emit(arg[0], arg, message);
                }
            }
        }
    }
});

function help_alias(){
    return listToString(Object.keys(alias)," | ");
}

commend.on("target",  (arg, message) => {
    message.author.id in _targetMap ?
    message.reply(`[ ${listToString(_targetMap[message.author.id], ", ")} ]`):
    message.reply(`undefind`);

})

commend.on("add", (arg, message) => {
    let res = addUser(message.author.id, arg.slice(1));
    if(res.length > 0){
        message.reply("added: [ "+listToString(res, ", ")+" ]");
        console.log(message.author.tag+"->added: [ "+listToString(res, ", ")+" ]");
    }
    else{
        let msg = new EmbedBuilder()
        .setColor(0x0000ff).
        setDescription(`\`\`\`/${arg[0]} [ ${help_alias()} ]\`\`\``);
        for(key in alias){
            msg.addFields({ name: key, value: listToString(alias[key],"\n"), inline: true })
        }
        message.reply({ embeds: [msg]});
    }
});

commend.on("remove", (arg, message) => {
    let res = removeUser(message.author.id, arg.slice(1));
    if(res.length > 0){
        message.reply("removed: [ "+listToString(res, ", ")+" ]");
        console.log(message.author.tag+"->removed: [ "+listToString(res, ", ")+" ]");
    }
    else{
        message.reply(`undefind`);
    }
});

client.login(config.Discord.token);
neos.Login(config.Neos.id, config.Neos.pw)

