# Simple Minecraft Bedrock Edition named teleport

**Experimental Beta API required**

**The Experimental API used by the plugin may break anytime!**

This is an ad-hoc implementation of a simple teleport command. The script 
plugin is based on the [minecraft-scripting-samples/starter](https://github.com/microsoft/minecraft-scripting-samples/tree/main/ts-starter) template.

You can try out this plugin on your own using `npm run local-deploy` and enabling
the plugin in your world settings.

## Commands

The output of the `!tp help` or `!tp ?` command:

![help](help-string.png)

## Limitations

There is no filesystem access for the plugin, location updates are therefore implemented via 
`dynamicProperties` (`key`-`value` pairs). The properites utilized by this script
are tied to the `world` entity. **This plugin therefore provides GLOBAL waypoint system!**.

It could be possible to rewrite tiny parts of the script to tie the locations to individual 
`player` entities. From my experience with migrating MC:BE worlds, I concluded that tying
data to `player` entities *could* be unstable (cannot be bothered to confirm).

## Installation

*chuckles*

To enable Experimental API in your server world you **have to copy it over a machine which can run the Bedrock client and enable the APIs over there. After that you have to copy this modified world back...** (Thanks, Microsoft! Q_Q) 

For more: 
https://learn.microsoft.com/en-us/minecraft/creator/documents/scriptingservers?view=minecraft-bedrock-stable#building-out-your-server-world

As this is purely ad-hoc solution for my personal needs (yes, I did not bother with the internal project renaming, UUIDs, ...), 
I just drop the `behavior_packs/starter/` folder into `serverRoot/development_behavior_packs/starter` (`manifest.json` is needed) and do the same
for the `dist` folder's **contents** (created by running `npm run local-deploy`).
If you need to disambiguate the plugin's UUID, refer to Microsoft's 
documentation.

Your server's `development_behavior_packs/starter` directory should have this 
structure:

```
- manifest.json
- pack_icon.png
- debug/
  - ...
- scripts/
  - ...
```

## Modification

As you will be pasting source code into the server folders, you can also modify 
them inplace for some minor tweaks (such as enabling `DEBUG` mode, chaing the 
command head from `!tp` to something else, etc.)

### Debug mode

**This script does not handle server privileges or permissions, enabling debug mode exposes debug commands to everyone. This script is not intended to be used on servers with untrusted clients.**

Debug mode must be explicitly enabled on the source level in the `scripts\bmtp-mc-lib.ts` file, `DEBUG` variable. 
It exposes some (surprisingly) *debug* functionality (via commands).

#### Command interpretation **with debug mode**:

* First, command is interpreted as a **debug** command - if it is a valid debug command, it performs a debug action, if not, nothing happens 
* Next, the very same command is interpreted as a regular comman (if it overlaps with a valid command)

### Dynamic properties

Dynamic property **keys** "reserved" (used) by the plugin: 
* `__BMTP*`, where `*` is any string *(not actually - meaning, these keys form a superset of keys actually used)*

#### Debug commands

* `!tp dbg-exit` - disables debug mode, no going back!
* `!tp dbg-inspect` - prints out all dynamic properties recognised/parsed by the script (all the script's storage)
* `!tp dbg-clear-IKNOWWHATIMDOING` - clears all the script's storage (dynamic properties used by the script - EXTREMELY DESCRUCTIVE OPERATION!)

## Testing

`npm run test`

*who could have expected 700+ tests for a simple parser?*

## Possible extensions, further work
* sharing of location lists
  * im/mutable
* dynamic toggling of debug commands, dynamic configuration (command head, dynamic property keys - in case of collisions)
  * scoreboards?
  * more dynamic properties?
* checking server operator for
  * debug commands 
  * config commands
* "proper" debug commands (so far part of the `!tp location` handling)
* set up an UUID for the addon
* further logic separation/mocking to allow true end-to-end testing
* fuzzing?
* importing functionality
  * encoding without whitespaces
  * limitations of MCBE chat message length?
* location suggestions
  * scenario: `!tp netherLocation` (in overworld)
    * response: `netherLocation found in a different dimension: Nether, End, send _yesE/_yesN to teleport to the End/Nether location`
* explore performance characteristics of `dynamicProperty` "getting"
  * to assess whether the current "caching" of locations is of any benefit (if not, remove it as it complicates code)

## Version upgrade reminder

* not only `npm` dependency
* modify `manifest.json` as well
