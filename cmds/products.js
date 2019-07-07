exports.command = 'products <command>'
exports.desc = 'Manage get of products'
exports.builder = function(yargs) {
  return yargs.commandDir('products')
}
exports.handler = function(argv) {}
