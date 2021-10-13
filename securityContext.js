const {
    Mongoose
} = require('mongoose');

const AppSettings = require(`./config.${process.env.NODE_ENV}`);
const mongoose = new Mongoose();
const passport = require('passport');
const jwt = require("jsonwebtoken");
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const UserSchema = require('./models/user');
const responseWriter = require('./utility/res');
const { json } = require('express');

var config = new AppSettings();

exports.dataConnectionPool = dataConnectionPool = {};

passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.secretKey
    },
    (jwtPayload, done) => {
        let userId = mongoose.Types.ObjectId(jwtPayload._id);
        let Users = dataConnectionPool[jwtPayload.tenantId].model('User', UserSchema);
        Users.findOne({
            _id: userId
        }, (err, user) => {
            if (err) {
                return done(err, false);
            } else if (user) {
                return done(null, user);
            } else {
                return done(null, false);
            }
        });
    }));

exports.dbContextAccessor = (req, res, next) => {

    const url = config.mongoDb(req.tenantId);

    if (!dataConnectionPool || !dataConnectionPool[req.tenantId]) {
        var dataConnectionMongoose = new Mongoose();
        dataConnectionMongoose.connect(url)
            .then(db => {
                dataConnectionPool[req.tenantId] = dataConnectionMongoose;
                return next();
            })
            .catch((err) => {
                next(err);
            });
    } else {
        return next();
    }
};

exports.dbContextAccessorWithoutContext = (req, res, next) => {

    if(req.query.tenantId === null || req.query.tenantId !== "1AF2380E-B634-49E9-BA1C-9773E6C20D4C")
    {
        var error = new Error("Unauhorized");
        error.staus = 401;
        return next(error);
    }
    const url = config.mongoDb(req.query.tenantId);

    if (!dataConnectionPool || !dataConnectionPool[req.query.tenantId]) {
        var dataConnectionMongoose = new Mongoose();
        dataConnectionMongoose.connect(url)
            .then(db => {
                dataConnectionPool[req.query.tenantId] = dataConnectionMongoose;
                return next();
            })
            .catch((err) => {
                next(err);
            });
    } else {
        return next();
    }
};

exports.verifyUser = passport.authenticate('jwt', {
    session: false
});

exports.extractJwtToken = (authHeader) => {
    if (authHeader.startsWith("Bearer ") || authHeader.startsWith("bearer ")){
        return authHeader.substring(7, authHeader.length);
    } else {
        return null
    }
}

exports.getJwtTokenPayload = (token) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const buff = new Buffer.from(base64, 'base64');
    const payloadinit = buff.toString('ascii');
    const payload = JSON.parse(payloadinit);
    return payload;
};

exports.verifyToken = (req, res, next) => {
    let token = this.extractJwtToken(req.headers.authorization);
    if (token === null) {
        return responseWriter.response(res, null, {
            success: false,
            "response": "Invalid authentication token"
        }, 403);
    }
    try{
        var payload = jwt.verify(token, config.secretKey, { algorithms: ['RS256'] });
        req.tenantId = payload.tenantId;
        req.userId = payload._id;
    } catch(ex) {
        responseWriter.response(res, null, {
            success: false,
            "response": ex.message
        }, 401);
    }
    next();
};

exports.verifyAdmin = (req, res, next) => {
    var user = req.user;
    if(user && user.roles.findIndex(role => role === 'admin') !== -1)
        next();
    else{
        return responseWriter.response(res, null, {
            success: false,
            "response": "Admin previledge is required. Access denied"
        }, 403);
    }
};

exports.ignoreIdsAndRoles = {
    idsAllowedToRead : 0,
    idsAllowedToUpdate : 0, 
    idsAllowedToDelete : 0,
    rolesAllowedToRead : 0,
    rolesAllowedToUpdate : 0,
    rolesAllowedToDelete : 0,
};