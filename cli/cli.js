import fs from 'fs'
import path from 'path'
import log from '@mwni/log'
import minimist from 'minimist'
import * as toml from 'toml'


export default async ({ origin, greeting, actions }) => {
	log.info(`*** ${greeting} ***`)
	log.info(`working dir is ${path.resolve()}`)

	const args = minimist(process.argv.slice(2))

	if(!fs.existsSync('config.toml')){
		if(fs.readdirSync('.').length === 0){
			log.info(`creating default config.toml in working dir`)
			fs.copyFileSync(path.join(origin.dirname, 'config.template.toml'), 'config.toml')
		}else{
			log.error(`no config.toml in working dir`)
			process.exit(1)
		}
	}

	try{
		var configText = fs.readFileSync('config.toml', 'utf-8')
		var config = toml.parse(configText)
	}catch(error){
		log.error(`corrupt config.toml in working dir`)
		log.error(error)
		process.exit(1)
	}

	let action = args._[0] ?? 'run'
	let actionCall = actions[action]

	if(!actionCall){
		log.error(`unknown action "${action}"`)
		process.exit(1)
	}

	return await actionCall({ config, args })
}
