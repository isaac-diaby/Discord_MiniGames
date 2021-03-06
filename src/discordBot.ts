import * as Discord from 'discord.js';
import DBLAPI from 'dblapi.js';
import { GameCommandsOBJ } from './Commands';
import { UserMD, IUserState } from './Models/userState';


export class DiscordBotRun {
  mainGuildData = {
    id: '566982444822036500',
    channels: {
      claimedPerksLog: {
        channel: '588462707594887185'
      },
      dblVotesLog: {
        channel: '600027239190495236'
      }
    }
  }; 

  port: number =  5000;
  botClient: Discord.Client;
  dbl: any;

  constructor() {
    this.botClient = new Discord.Client();
    this.botClient.login(process.env.BOT_AUTHTOKEN);
    this.botClient.on('ready', () => {
      this.botClient.user.setActivity('Discord Mini Games | ~help');
      console.log(`${this.botClient.user.username} is online`);
      this.botOnlineListen();
      if (process.env.PRODUCTION === 'True') {
          console.log('starting DBL WH')
          this.dbl = new DBLAPI(
        process.env.DBL_WEBHOOK_TOKEN,
        {
          statsInterval: 900000,
          webhookAuth: process.env.DBL_WEBHOOK_SECRET,
          webhookPort: this.port,
        },
        this.botClient
      );
         this.dbl.webhook.on('ready', (hook: any) => {
           console.log(
             `Webhook running: http://${hook.hostname}:${hook.port}${hook.path}`
           );
         });
        this.dblOnlineListen();
      }
    });
  }

  async dblOnlineListen() {
    this.dbl.webhook.on('vote', (vote: any) => {
  console.log(`User with ID ${vote.user} just voted!`);
  });
    this.dbl.on('posted', () => {
      console.log('Server count posted!');
    });
    this.dbl.on('error', (e: any) => {
      console.log(`Oops! ${e}`);
    });
}

  async botOnlineListen() {
    this.botClient.on('message', receivedMessage => {
//       console.log(receivedMessage);
//SupportingGuild Commands
        if (this.getChannelType(receivedMessage) === 'dm') return;

      
      if (!receivedMessage.content.startsWith(process.env.BOT_PREFIX)) {
        return;
      }
      // Prevent bot from responding to its own messages and other bots
      if (
        receivedMessage.author === this.botClient.user ||
        receivedMessage.author.bot
      ) {
        return;
      }
      // check if users info is in the DB else create it
      //@ts-ignore
      UserMD.byUserID(
        receivedMessage.author.id,
        (err: any, userData: IUserState) => {
          if (!userData) {
            this.createNewUserProfile(
              receivedMessage.author,
              receivedMessage.channel,
              receivedMessage.guild.id
            );
            return true;
          } else if (
            receivedMessage.guild && userData.serverAccounts.get(receivedMessage.guild.id) === undefined
          ) {
            this.createNewAccount(
              userData,
              receivedMessage.author,
              receivedMessage.channel,
              receivedMessage.guild.id
            );
          } else {
            let commands = receivedMessage.content
              .toLowerCase()
              .substr(process.env.BOT_PREFIX.length)
              .split(' ');
            let primaryCmd = commands[0];
            let argsCmd = commands.slice(1);

            switch (userData.ingame.isInGame && primaryCmd !== '!leave') {
              case true:
                const youAreAlreadyInAGameMSG = new Discord.RichEmbed()
                  .setColor('#F44336')
                  .setAuthor(`${receivedMessage.author.tag}`)
                  .setDescription(
                    `You are already in a game, you cant run any other commands untill your current game is over`
                  )
                  .addField(
                    'solution:',
                    `Run ~!leave game (to for-fit the game)`
                  );
                receivedMessage.channel.send(youAreAlreadyInAGameMSG);
                break;
              default:
                // parsing the command sent to the bot to main command and arguments
                let gameCommandClass = GameCommandsOBJ[primaryCmd];
                if (!gameCommandClass) {
                  this.noCommandsFound(receivedMessage, primaryCmd);
                } else if (
                  gameCommandClass.isPrime! &&
                  userData._sub.ConnectedLevel < 2
                ) {
                  //TODO: prime commands need connection level greater than 2 msg
                } else if (gameCommandClass.execute !== undefined) {
                  new gameCommandClass.execute(
                    this.botClient,
                    receivedMessage,
                    argsCmd
                  );
                }
                //receivedMessage.delete();
                break;
            }
          }
        }
      );
    });
  }

  noCommandsFound(Msg: Discord.Message, triedCmd: string) {
    const primaryCmdErrorMSG = new Discord.RichEmbed()
      .setColor('#F44336')
      .setDescription(`${Msg.author}`)
      .addField('Error:', `The command "${triedCmd}" does not exist!`);
    // Msg.channel.send(primaryCmdErrorMSG);
  }

  async createNewAccount(
    userData: IUserState,
    userDiscordInfo: Discord.User,
    discordChannel: Discord.TextChannel
      | Discord.DMChannel
      | Discord.GroupDMChannel,
    guildID: string
  ) {
    if (
      (userData._sub.ConnectedLevel > 0 &&
        userData._sub.accountsLimit > userData.serverAccounts.size) ||
      userData.serverAccounts.size === 0 ||
      guildID === this.mainGuildData.id
    ) {
      UserMD.findOneAndUpdate(
        { userID: userDiscordInfo.id },
        {
          $set: {
            ['serverAccounts.' + guildID]: { guildID },
          },
        }
      )
        .exec()
        .then(next => {
          const newAccountMember = new Discord.RichEmbed()
            .setColor('#60BE82')
            .setAuthor(`${userDiscordInfo.tag}`)
            .setTitle('New Account Created!')
            .setDescription(
              'You are now part of the system for this server. Now you have access to play games on this server! Have fun winning!'
            )
            .addField(
              'Join The Official Server',

              'http://bit.ly/CGBofficialServer'
            )
            .setFooter(
              'For more features and exclusive bonuses become a Donater!: http://bit.ly/CGBdonate'
            );
          discordChannel.send(newAccountMember);
        });
    } else {
      const newAccountmemberFailedNotAPrtron = new Discord.RichEmbed()
        .setColor('#F44336')
        .setAuthor(`${userDiscordInfo.tag}`)
        .setTitle('New Account?')
        .setDescription(
          'It looks like you want to register an account on a new server. You dont have a subscription to allow you to do this! Follow these solutions'
        )
        .addField(
          'Upgrade Your Connection level (recommended)',

          'Make sure you are in the official server ( http://bit.ly/CGBofficialServer ). Increase your connection level by donating towords a/next tier @ http://bit.ly/CGBdonate then use the ~claim perks command in the official server to activate your new perks!'
        )
        .addField(
          'Delete unused existing account on other servers',

          '~!delete account - This will delete the account that the current server is using. This will allow you to free up some of your free account slots for the servers you really want an account on.'
        )
        .setFooter(
          'For more features and exclusive bonuses become a Donater!: http://bit.ly/CGBdonate'
        );
      discordChannel.send(newAccountmemberFailedNotAPrtron);
    }
  }

  async createNewUserProfile(
    userDiscordInfo: Discord.User,
    discordChannel: Discord.TextChannel
      | Discord.DMChannel
      | Discord.GroupDMChannel,
    guildID: string
  ) {
    // console.log('user not found in DB');
    const newUser = new UserMD({
      userID: userDiscordInfo.id,
      serverAccounts: {
        [guildID]: { guildID },
      },
    });
    newUser
      .save()
      .then(data => {
        // new user created success message
        const successfulNewAccountMSG = new Discord.RichEmbed()
          .setColor('#60BE82')
          .setAuthor(`${userDiscordInfo.tag}`)
          .setTitle('New Profile Created!')
          .setDescription(
            'I see that this is your first time using the Connect Games Bot (CGB). Go to our website to learn what it can do or type ~help!'
          )
          //          .addField('Website', '') TODO: add website link
          .addField('discordbots.org', 'http://bit.ly/CGBdiscordBots')
          .addField(
            'Join The Official Serverr',
            'http://bit.ly/CGBofficialServer'
          )
          .setFooter(
            'For more features and exclusive bonuses become a Donater!: http://bit.ly/CGBdonate'
          );
        discordChannel.send(successfulNewAccountMSG);
      })
      .catch(e => {
        // new user created fail message
        const FailedNewUserMSG = new Discord.RichEmbed()
          .setTitle('New User Error!')
          .setColor('#F44336')
          .setAuthor(`${userDiscordInfo.tag}`)
          .setDescription(
            `There was an error creating ${userDiscordInfo} account on the server`
          );
        discordChannel.send(FailedNewUserMSG);
        console.log(e);
      });
  }
  getChannelType(message: Discord.Message)
 {
      return message.channel.type
  }
}
