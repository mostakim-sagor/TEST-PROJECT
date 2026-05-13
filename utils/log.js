const chalk = require('chalk');

const logFn = (data, option = "LOG") => {
	switch (option) {
		case "warn":
			console.log(chalk.yellow('[ WARNING ] » ') + data);
			break;
		case "error":
			console.log(chalk.red('[ ERROR ] » ') + data);
			break;
		case "success":
			console.log(chalk.green('[ SUCCESS ] » ') + data);
			break;
		case "master":
			console.log(chalk.cyan('[ BOT ] » ') + data);
			break;
		default:
			console.log(chalk.magenta(`[ ${option.toUpperCase()} ] » `) + data);
			break;
	}
};

logFn.loader = (data, option) => {
	switch (option) {
		case "warn":
			console.log(chalk.yellow('[ LOADER WARNING ] » ') + data);
			break;
		case "error":
			console.log(chalk.red('[ LOADER ERROR ] » ') + data);
			break;
		default:
			console.log(chalk.green('[ MOSTAKIM V2 BOT LOAD ] » ') + data);
			break;
	}
};

logFn.error   = (label, msg) => logFn(`${label}: ${msg}`, "error");
logFn.warn    = (label, msg) => logFn(`${label}: ${msg}`, "warn");
logFn.info    = (label, msg) => logFn(`${label}: ${msg}`, "LOG");
logFn.success = (label, msg) => logFn(`${label}: ${msg}`, "success");
logFn.master  = (label, msg) => logFn(`${label}: ${msg}`, "master");

module.exports = logFn;
