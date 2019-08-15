require("dotenv").config();
const Discord = require("discord.js");
const config = require("./config.json");
const bot = new Discord.Client({ disableEveryone: true });
const axios = require("axios");
bot.login(process.env.BOT_TOKEN);

//TODO: only change by admin role

bot.on("ready", () => {
  // List servers the bot is connected to
  console.log("Servers:");
  bot.guilds.forEach(guild => {
    console.log(" - " + guild.name);
    /*
    console.log(" - " + guild.id);
    console.log(" - " + guild);

    // List all channels
    guild.channels.forEach(channel => {
      console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`);
    });*/
  });
});

bot.on("ready", async () => {
  console.log(`${bot.user.username} is now online.`);
  bot.user
    .setActivity("your back. 😁", { type: "WATCHING" })
    .then(presence =>
      console.log(
        `Activity set: ${presence.game ? presence.game.name : "none"}`
      )
    )
    .catch(console.error);
});

bot.on("message", async message => {
  if (message.author.bot) return;
  let args = message.content.split(" ");
  let command = args[0];
  if (command == config.prefix + "list") {
    getCommands(message);
  }
});

//exit if 404
async function getCommands(message) {
  let guild = message.guild.id;
  let list = [];
  axios
    .get(process.env.STORAGE_SERVICE + guild)
    .then(async function(response) {
      //compose array of all triggers
      for (i = 0; i < Object.keys(response.data).length; i++) {
        let j = Object.keys(response.data)[i];

        list.push("TRIGGER:  " + j + "   ~   RESPONSE:  " + response.data[j]);
      }
      //send embed of all triggers and indexes
      const embed = new Discord.RichEmbed()
        .setColor("#123456")
        .setTitle("**CuRe Bot Trigger List**")
        .setTimestamp()
        .setFooter("💙 CuRe Bot");
      for (i = 0; i < list.length; i++) {
        embed.addField(list[i], "Index: " + i, true).addBlankField();
      }
      message.channel.send(embed);
    })
    .catch(async function(error) {
      await message.channel.send("Error retrieving trigger list. \n" + error);
    });
}

bot.on("message", async message => {
  if (message.author.bot) return;

  let prefix = config.prefix;
  let messageBody = message.content.split(" ");
  let command = messageBody[0];

  if (command == `${prefix}help`) {
    const embed = new Discord.RichEmbed()
      .setColor("#123456")
      .setTitle("**CuRe Bot Trigger List**")
      .setDescription("***Cu***stom ***Re***sponse Bot")

      .addField(
        config.prefix + "help",
        "Shows what you are looking at right now.",
        true
      )
      .addField(
        config.prefix + "create your trigger - your response",
        'This command **creates a trigger.** Whenever a user send a messages containing the "trigger" string, the bot will respond with the "response" string.',
        true
      )
      .addField(
        config.prefix + "list",
        "Shows a **list of the triggers** and responses on the server.",
        true
      )
      .addField(
        config.prefix + "delete index",
        "**Deletes a trigger** from the server. To get the trigger's index, use the `*list` command.",
        true
      )
      .setTimestamp()
      .setURL("https://github.com/joshkmartinez/CuRe-Bot")
      .setFooter("💙 CuRe Bot");

    message.channel.send(embed);
  }
});

//add trigger
bot.on("message", async message => {
  if (message.author.bot) return;
  let prefix = config.prefix;
  let guild = message.guild.id;
  if (
    message.content.substring(0, prefix.length + "create".length) ==
    prefix + "create"
  ) {
    let content = message.content
      .substring(prefix.length + "create".length + 1)
      .split(" - ");

    if (content.length < 2) {
      return await message.channel.send(
        "You did not include an argument. Try again."
      );
    }

    axios
      .get(process.env.STORAGE_SERVICE + guild)
      .then(async function(response) {
        let before = JSON.stringify(response.data);
        let after = JSON.parse(
          before.substring(0, before.length - 1) +
          ',"' +
          content[0] + //trigger
          '":"' +
          content[1] + //response
            '"}'
        );
        //pushes new trigger list
        axios
          .put(process.env.STORAGE_SERVICE + guild, after)
          .then(async function(response) {
            await message.channel.send(
              "Trigger added successfully. To see the new trigger list run `" +
                config.prefix +
                "list`."
            );
          })
          .catch(async function(error) {
            return console.log("Error adding new trigger.  \n" + error);
          });
      })
      .catch(async function(error) {
        return console.log(
          "Error retrieving trigger list. Cannot add new trigger.  \n" + error
        );
      });
  }
});

//remove trigger cmd
bot.on("message", async message => {
  if (message.author.bot) return;
  let prefix = config.prefix;
  let guild = message.guild.id;
  let args = message.content.split(" ");
  let command = args[0];
  if (command == prefix + "remove") {
    if (args[1] == undefined || isNaN(args[1])) {
      await message.channel.send(
        "Include a trigger index to remove.\nTo see the trigger list run `" +
          config.prefix +
          "list`."
      );

      return;
    }
    //check if number and if in bounds
    axios
      .get(process.env.STORAGE_SERVICE + guild)
      .then(async function(response) {
        let before = response.data;
        let keys = Object.keys(response.data);
        if (args[1] > keys.length - 1 || args[1] < 0) {
          return await message.channel.send("Trigger index out of bounds.");
        }
        let remover = keys[args[1]];
        delete before[remover];
        //pushes new trigger list
        axios
          .put(process.env.STORAGE_SERVICE + guild, before)
          .then(async function(response) {
            await message.channel.send(
              "Trigger deleted successfully. To see the new trigger list run `" +
                config.prefix +
                "list`."
            );
          })
          .catch(async function(error) {
            return console.log("Error removing trigger.  \n" + error);
          });
      })
      .catch(async function(error) {
        return console.log(
          "Error retrieving trigger list. Cannot remove trigger.  \n" + error
        );
      });
  }
});

bot.on("message", async message => {
  let guild = message.guild.id;
  if (message.author.bot) return;
  //do not look for triggers if message contains bot prefix
  if (message.content.substring(0, 1) == config.prefix) return;
  axios
    .get(process.env.STORAGE_SERVICE + guild)
    .then(async function(response) {
      for (i = 0; i < Object.keys(response.data).length; i++) {
        let trigger = Object.keys(response.data)[i];
        if (message.content.toLowerCase().includes(trigger)) {
          await message.channel.send(response.data[trigger]);
        }
      }
    })
    .catch(async function(error) {
      console.log("Error retrieving trigger list. Cannot search. \n" + error);
    });
});

bot.on("message", async message => {
  if (message.author.bot) return;
  let messageBody = message.content.split(" ");
  let command = messageBody[0];

  if (command == `${config.prefix}ping`) {
    const m = await message.channel.send("Pong 🏓");
    m.edit(
      `Pong 🏓 Latency is ${m.createdTimestamp -
        message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`
    );
  }
});
