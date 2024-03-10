//file to manipulate slash commands, but can use a command handler
const { REST, Routes, ApplicationCommandOptionType, Application } = require('discord.js');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }) //makes sure the .env file is found
const TOKEN = process.env.TOKEN;

//create the commands array to handle the commands
const commands = [
    {
        name: 'gpt', //name of the slash command thatll show up
        description: 'activates gpt bot', 
        options: [ //the text that comes after the slash command will go here, will be sent to gpt for the reply
            {
                name: 'text-content',
                description: 'What do you want to say to Mr. GPT',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name: 'ammo',
        description: 'Get Damage and Penetration info',
        options: [
            {
                name: 'ammo-name',
                description: 'Type in the ammo name ex. m855a1',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
];

//set the token of our bot
const rest = new REST({ version: '10'}).setToken(TOKEN);

//hidden function to handle the slash commands being sent
(async() => {
    try {
        console.log('Registering commands ....');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),  {body: commands }
        );
        console.log('command registered');
    } catch (error) {
        console.log(error);
    }
})();