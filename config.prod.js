const fs = require('fs');
function AppSettings() {

    const PUB_KEY = fs.readFileSync(__dirname + '/public-key.pem', 'utf8');

    this.secretKey = PUB_KEY;

    this.mongoTenants = 'mongodb://localhost:27017/Tenants';
    this.redisHost = "redis://{{CONNECTION_STRING}}";
    this.redisPass = "{{CONNECTION_SECRET}}";
    this.rabbitMqConnection = "amqps://{{CONNECTION_STRING}}";
    this.mongoDb = (dbName) => {
        return `mongodb://localhost:27017/${dbName}`;
    }
};

module.exports = AppSettings;