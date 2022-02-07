<p align="center"><img alt="redsink" src="https://user-images.githubusercontent.com/1965406/146062822-7fec4cda-4b5a-4895-b1a3-8e61ca50beb8.png"/></p>

This is just a simple cli tool used to migrate data in redis servers. It supports standalone servers as well as those in AWS Elasticache. It uses a combination of SCAN, DUMP, RESTORE and MONITOR to perform the migration as well as watch any incoming set commands and shuffle those changes over to the destination, to avoid drift during the migation.

## Installation
Until the module gets published to a registry of some kind, you can install it to your machine locally like so:

1. By downloading the relevant available binary from the releases page: https://github.com/snypelife/redsink/releases
2. From within the repo, running `npm link` or `npm i -g .`
3. You can also create a simple tarball using `make tar`.

## Basic usage
```
Usage: redsink [options] [source_host] [dest_host]

Options:
  -V, --version               output the version number
  -d, --debug                 Enable debug mode
  --hot-sync                  Enable hot syncing
  --from <source_host>        Source host
  --from-token <token>        Source host AUTH token
  --from-user <user>          Source host user name
  --from-password <password>  Source host user password
  --to <dest_host>            Dest host
  --to-token <token>          Dest host AUTH token
  --to-user <user>            Dest host user name
  --to-password <password>    Dest host user password
  -h, --help                  display help for command
```

## Examples
**Simple local migration:**

`redsink localhost:6379 localhost:7000`

`redsink --from localhost:6379 --to localhost:7000`

**Local to remote:**

`redsink localhost:6379 redis://foo.zlpjwb.use1.cache.amazonaws.com`

**Remote to remote:**

`redsink redis://foo.zlpjwb.use1.cache.amazonaws.com redis://bar.zlpjwb.use1.cache.amazonaws.com`

**Local to remote with AUTH and SSL:**

`redsink --from localhost:6479 --to rediss://username:password@master.xxx.XXX.use1.cache.amazonaws.com`

`redsink --from localhost:6479 --to rediss://master.xxx.XXX.use1.cache.amazonaws.com --to-user username --to-password password`

`redsink --from localhost:6479 --to rediss://:auth_token@master.xxx.XXX.use1.cache.amazonaws.com`

`redsink --from localhost:6479 --to rediss://master.xxx.XXX.use1.cache.amazonaws.com --to-token auth_token`

**Specific database index:**

`redsink localhost:6379/0 localhost:6379/1`

## Notes
If you're using this tool from your local machine, you may want to use something like the [`caffeinate`](https://ss64.com/osx/caffeinate.html) command to prevent the machine from sleeping during a long running migration and breaking the connection. 

`caffeinate redsink localhost:6379 localhost:7000`

---
Also, if you're using an intermediary instance to perform the remote to remote migration (which I recommend), consider using something like the [`screen`]() command, to allow for the process to continue in the background and not relying on a constant SSH connection. Otherwise you can end up with failing migrations that only half complete.

The additional benefit of using an intermediate instance, is that you can take advantage of the internal network speeds of Cloud Service Providers to reduce overall latency and severely reduce the time for the migration to complete.

Some anecdotal evidence:

I was able to migrate databases that had **tens of millions of keys** in roughly **32 minutes**, by using an intermediate instance within the same VPC and region of the elasticache clusters.

## Development
In order to work on this effectively, you will need both node.js and Docker on your machine.

- [nvm](https://github.com/nvm-sh/nvm) will help managing node.js versions easier.
- [Docker](https://www.docker.com/get-started) will be used to spin up ephemeral containers to run integration tests against.

`nvm use` will activate the correct node version for this projects based on the .nvmrc file. If it errors, chances are you need to install the version with `nvm install`.

`npm i` will install the node_modules needed to work on this project. Alternatively, you can use `make install` to install both node.js and the node_modules.

`npm t`/`make test` will run the test suite.

`npm run lint`/`make lint` will lint the code.

`npm run cov`/`make coverage` will open the code coverage report (after the test suite has been run)
