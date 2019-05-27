exports.command = 'cards <command>'
exports.desc = 'Manage set of cards'
exports.builder = function(yargs) {
  return yargs.commandDir('cards')
}
exports.handler = function(argv) {}
