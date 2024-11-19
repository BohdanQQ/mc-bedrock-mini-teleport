# Simple Minecraft Bedrock named teleport

**Experimental Beta API required**

This is an ad-hoc implementation of a simple teleport command. The script 
plugin is based on the [minecraft-scripting-samples/starter](https://github.com/microsoft/minecraft-scripting-samples/tree/main/ts-starter) template.

The build step `npm run build` is modified. We parse the `locations.csv` file 
placed in the root of the project. The file contains CSV rows in the format:

`dimension,name,x,y,z` where `dimension = overworld|nether|end`. The file is 
expected to contain **NO header**.

## Commands

Start your chat message with `!tp`, followed by a space and either:

* `?` or `help` for the list of locations for your current dimension
* `help-all` for the list of all locations for all dimensions
* anything else is interpreted as a location `name` as specified in the `locations.csv` file
  * `name` is case-sensitive
  * if `name` match exists in the `locations.csv` file, you will be teleported to the
corresponding coordinates

## Limitations

There is no filesystem access for the plugin, location updates are therefore possible only by

1. (primary/documented) `npm run build`-ing again
2. ("just works" / might break anytime) manually editing deployed file
   * usually single `.js` file in `[BEHAVIOR PACKS ROOT]/starter/scripts` 

Both methods require running the `reload` command (`/reload` for clients).

The lack of "dynamic" presistence also prohibits "client-side" editing of the location list.

## Installation

*chuckles*

To enable Experimental API in your server world you **have to copy it over a machine which can run the Bedrock client and enable the APIs over there. After that you have to copy this modified world back...** (Thanks, Microsoft! Q_Q) 

For more: 
https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingservers?view=minecraft-bedrock-stable#building-out-your-server-world

As this is purely ad-hoc solution for my personal needs (yes, I did not bother with the internal project renaming, UUIDs, ...), 
I just drop the contents of the `dist` folder into `serverRoot/development_behavior_packs/starter`.

**The Experimental API used by the plugin may break anytime!**
