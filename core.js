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
const userList = require("./userList.json");
const targetMap = require("./targetMap.json")
const fs = require("fs")
_userList = new Set(userList);
_targetMap = new Map(targetMap);
const EventEmitter = require('events').EventEmitter;
const commend = new EventEmitter();
const DEBUG = true;

function addUser(user){
    _userList.add(user);
    fs.writeFileSync("./userList.json", JSON.stringify(Array.from(_userList)));
}
function removeUser(user){
    _userList.delete(user);
    fs.writeFileSync("./userList.json", JSON.stringify(Array.from(_userList)));
}

neos.on("login",(obj) => {
    console.log("login");
    if(DEBUG)console.log(obj);
    so.observe(3000);
});


so.on("detectNewTarget",(sesson) => {
    if(DEBUG)console.log(sesson);
    _userList.forEach(member =>
    {
        client.users.fetch(member, false).then((user) => {
            neos.GetUser(sesson.HostUserId).then((Neosuser) => {
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
                        user.send({ embeds: [msg]});
                    } catch (error) {
                        console.error(error);
                    }
            });
        });
    });
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
    if(DEBUG)console.log(message);
    if(message.content.length > 0){
        if(message.content.charAt(0) == "/")
        {
            let arg = message.content.substr(1).split(" ");
            if(arg.length > 0){
                commend.emit(arg[0], arg, message);
            }
        }
    }
});

commend.on("add", (arg, message) => {
    addUser(message.author.id);
    message.reply("added UserList")
    console.log("addUser: "+message.author.tag);
});

commend.on("remove", (arg, message) => {
    removeUser(message.author.id);
    message.reply("removed UserList")
    console.log("removeUser: "+message.author.tag);
});

client.login(config.Discord.token);
neos.Login(config.Neos.id, config.Neos.pw)

