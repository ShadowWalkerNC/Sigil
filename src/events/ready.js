module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`\x1b[32m\x1b[1m[READY] Logged in as ${client.user.tag} with ${client.commands.size} commands.\x1b[0m`);
    },
};
