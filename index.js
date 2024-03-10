const { channel } = require('diagnostics_channel');
const axios = require('axios');
const {Client, IntentsBitField, MembershipScreeningFieldType, GuildMemberManager} = require('discord.js'); //destructuring - only taking some things from the import

//configure openai
const {Configuration, OpenAIApi} = require('openai');

//configure .env path 
const path = require('path');
const { coerceInputValue } = require('graphql');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }) //makes sure the .env file is found
const TOKEN = process.env.TOKEN;

//Client is the bot, need to initialize a client, its a class
//A guild is a server
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds, //intents are a set of permissions that the bot can use to access a set of events
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ]
});

//configure openAI 
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

//start bot(client)
client.on('ready', (c) => {
    console.log(`${c.user.tag} is online`); //c is the client instance, ${} is used with the backticks to log the user name
});

//configure tarkov API via GraphQL
async function sendGraphQLRequest(query)
{
    const url = 'https://api.tarkov.dev/graphql'; //the endpoint

    const response = await axios.post(url, {
        query: query
    });

    return response.data.data;
}

//Welcome message stated in the channel, based off of the channel id
client.on('guildMemberAdd', (member) => {
   //member.send('Welcome to the Continental!');
   const channel = client.channels.cache.get('1138366071309602880');
   channel.send(`@${member.user.username} Welcome to The Continental!`);
});

//listening out for interactions which triggers the slash command
client.on('interactionCreate', async (interaction) => {
    if(!interaction.isChatInputCommand() || (interaction.channel.id != process.env.GPT_CHANNEL_ID))
    {
        return;
    }
    //ischatinput command is a boolean
    if(interaction.commandName === 'gpt')                           //looking for gpt command
    {
        const textContent = interaction.options.get('text-content');
        //console.log(textContent.value);                           //get() returns the data of the text-content option
        const textToGPT = textContent.value;                        //grabbing the text itself (string), to send to GPT
        
        let conversationLog = [{
            role: 'system', content: "You are a helpful chatbot."
        }];

        conversationLog.push({
            role: 'user',
            content: textToGPT
        });
        //console.log(textToGPT);

        //await interaction.channel.sendTyping(); //alert that the bot is typing

        await interaction.deferReply();

        const result = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: conversationLog
        }); //chat is done, content is held in result

        //TODO: need to cut down message in case it is over 2000 words
        //For now, will just send arbitraty error message
        const finalMessage = result.data.choices[0].message.content;
        if(finalMessage.length >= 2000)
        {
            interaction.reply('Sorry, answer is greater than 2k character');
        }
        else
        {
            interaction.editReply(finalMessage);
        }
    }

    if(interaction.commandName === 'ammo')
    {
        const textInput_raw = interaction.options.get('ammo-name'); //get the ammo name
        const textInput = textInput_raw.value.toLowerCase();
        const query = `
                query	AmmoResults{
                items(name: "${textInput}", type: ammo){
                name
                properties{
                ...on ItemPropertiesAmmo
                {
                    caliber
                    damage
                    penetrationPower
                }
                }
            }
        }
        `

    //await interaction.deferReply();

    const data = await sendGraphQLRequest(query);
    const channel = client.channels.cache.get('1138366071309602880'); //dont seem to need this

    const query_String = JSON.stringify(data); //reformat returned object into a string
    const split_name = query_String.split("{\"name\":"); //split the string to separate the different returned objects

    const input_ammo = textInput.toUpperCase(); //this will be equal to what the user typed
    //There can be multiple ammos with a similar name, need to find a way to adjust for caliber
    //but for now, we can just find the earliest match of the name, which will be accurate
    var correctIndex;
    for(i = 0; i < split_name.length; i++)
    {
        if(split_name[i].includes(input_ammo))
        {
            correctIndex = i;
            break;
        }
    }

    //can probably split this substring by commas to get each section
    const split_comma = split_name[correctIndex].split(",");
    var damageIndex, penIndex;
    //now we have the specific parts we need, we just need to see if we can extract the thiings we need
    for(i = 0; i < split_comma.length; i++)
    {
        if(split_comma[i].includes("damage"))
        {
            damageIndex = i;
        }

        if(split_comma[i].includes("penetrationPower"))
        {
            penIndex = i;
        }
    }
    //formatting
    const damage = split_comma[damageIndex].replace(/"/g,'')
    const penetration = split_comma[penIndex].replace(/"|{|}|]/g,'')
    const message = damage + ' ' + penetration;
    interaction.reply(message);
    }
});

client.login(TOKEN);
//we dont want to restart the bot manually with changes
//add a library called nodemon, needs to be globally installed
//npm install -g nodemon isntalls it globally
//Type in nodemon, and itll go into the package file to run the index file
//or run it with nodemon src/index.js
//to use nodemon, need to be in cmd