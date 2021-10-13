var express = require('express');
var router = express.Router();

const responseWriter = require('../utility/res');
var SecurityContext = require('libidentity');

const AppSettings = require(`../config.${process.env.NODE_ENV}`);
var config = new AppSettings();
const securityContext = new SecurityContext(config);

const redis = require('redis');
var redisClient = redis.createClient(config.redisHost);

redisClient.auth(config.redisPass);

router.all('*', securityContext.verifyToken, securityContext.dbContextAccessor, securityContext.verifyUser)
  /**
   * A valid authorization token is mandatory for this endpoint. Set cache endpoint.
   * @route POST /cache/set
   * @group Redis - redis-service endpoints
   * @param {SetCacheInfo.model} setInfo.body.required
   * @returns {object} 200 - An object stating the status
   * @returns {Error}  default - Unexpected error
   * @security JWT
   */
  .post('/set', function(req, res, next) {
    
    let cacheSet = false;

    try {
      let key = req.body.key;
      let payload = req.body.cachePayload;
      let expireIn = req.body.expireIn;
      let expire = req.body.doesExpire;

      if(payload === null || typeof(payload) === 'undefined'){
        return responseWriter.response(res, {
          success: false,
          response: `Invalid payload`
        }, null, 400);
      }

      if(key === null || typeof(key) === 'undefined'){
        return responseWriter.response(res, {
          success: false,
          response: `Invalid key`
        }, null, 400);
      }

      if(expire !== null && typeof(expire) !== 'undefined' && expire === false) {
        cacheSet = redisClient.set(req.tenantId + "_" + key, JSON.stringify(payload));
      }
      else {
        cacheSet = redisClient.setex(req.tenantId + "_" + key, expireIn, JSON.stringify(payload));
      }

      return responseWriter.response(res, {
        success: cacheSet,
        response: `Cache set status: ${cacheSet}`
      }, null, 200);
    }
    catch (ex)
    {
      console.log(ex);
      return responseWriter.response(res, {
        success: cacheSet,
        response: `Something went wrong. Cache set: ${cacheSet}`
      }, null, 500);
    }

  })
/**
   * A valid authorization token is mandatory for this endpoint. Set cache endpoint.
   * @route POST /cache/get
   * @group Redis - redis-service endpoints
   * @param {GetCacheInfo.model} getCacheInfo.body.required
   * @returns {object} 200 - An object stating the status and response object
   * @returns {Error}  default - Unexpected error
   * @security JWT
   */
  .post('/get', function(req, res, next) {
    let key = req.body.key;

    if(key !== null && typeof(key) !== 'undefined') {
      redisClient.get(req.tenantId + "_" + key, (err, value) => {
        if (err !== null || value === null) {
            return responseWriter.response(res, null, {
                success: false,
                message: `No value found for key: ${key}`
            }, 200);
        }
        let cacheData = JSON.parse(value);
      
        return responseWriter.response(res, {
            success: true,
            data: cacheData
          }, null, 200);
      });
    }
  })
  /**
   * A valid authorization token is mandatory for this endpoint. Set cache endpoint.
   * @route POST /cache/delete
   * @group Redis - redis-service endpoints
   * @param {GetCacheInfo.model} deleteCacheInfo.body.required
   * @returns {object} 200 - An object stating the deletion status and response object
   * @returns {Error}  default - Unexpected error
   * @security JWT
   */
  .post('/delete', function(req, res, next) {
    let key = req.body.key;
    
    if(key !== null && typeof(key) !== 'undefined') {
      redisClient.del(req.tenantId + "_" + key, (err, success) => {
        if (err !== null || success === null || success === 0) {
            return responseWriter.response(res, null, {
                success: false,
                message: `Failed to remove cache`
            }, 200);
        }
        return responseWriter.response(res, {
            success: true,
            data: `Cache removed for key ${key}`
          }, null, 200);
      });
    }
  })
  

/**
 * @typedef SetCacheInfo
 * @property {string} key.query.required - A string identifier for the cache - eg: testkey
 * @property {object} cachePayload.query.required - Payload of the cache - eg: {"message": "Hello world"}
 * @property {boolean} expire.query.required - Should expire or not? - eg: true
 * @property {number} expireIn.query.required - expiration duration in seconds. - eg: 120
 */

/**
 * @typedef GetCacheInfo
 * @property {string} key.query.required - A string identifier for the cache - eg: testkey
 */

module.exports = router;
