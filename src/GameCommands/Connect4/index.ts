import * as Discord from 'discord.js';
import mongoose from 'mongoose';
import { OnlineGames } from '../OnlineGame';
import { IGameMetaInfo } from '../../Models/gameState';

export default class Connect4 extends OnlineGames {
  metaConfig: IGameMetaInfo = {
    title: 'Connect 4',
    numPlayers: 2,
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5R4_FiAZMoc0RAFLMSLPt7_IocF6WC0SM7t7yWaxGDyAhY7x5mg',
  };

  constructor(
    client: Discord.Client,
    message: Discord.Message,
    cmdArguments: Array<string>
  ) {
    super(client, message, cmdArguments);
    // const cUser = message.guild.member(
    //   message.mentions.users.first() || message.guild.members.get(this.args[0])
    // );
    this.GameConfirmationStage(this.metaConfig).then(start => {
      start ? console.log('running next') : console.log('STOP');

      // console.log(this.gameMetaData);
    });
  }
}