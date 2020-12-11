const { getYArgs, getDatabase } = require('./helpers')

const yargs = getYArgs()

const { argv } = yargs
  .option('code', {
    description: 'The code of the language',
    demandOption: true,
    type: 'string'
  })

async function addLanguage () {
  const database = await getDatabase()

  const languageOption = {
    code: argv.code
  }

  const [language, created] = await database.Language.findOrCreate({
    where: {
      code: languageOption.code
    },
    defaults: languageOption
  })

  console.table(language.get())
  console.log({ created })

  database.disconnectDatabase()
}

addLanguage()
