/*
 * Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 * 
 * Copyright (c) 2014 2015 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Fabio Verboso
 */


var cluster = require('cluster');
if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', function(worker, code, signal) {
    if (code==3) cluster.fork();
  });
}

if (cluster.isWorker) {

    //Loading configuration file
    nconf = require('nconf');
    nconf.file ({file: 'settings.json'});

    //main logging configuration                                                                
    log4js = require('log4js');
    log4js.loadAppender('file');
    log4js.addAppender(log4js.appenders.file('/var/log/s4t-lightning-rod.log'));               

    //service logging configuration: "main"                                                  
    var logger = log4js.getLogger('main');  

    logger.info('#############################');  
    logger.info('Starting Lightning-rod...');  
    logger.info('#############################');  

    var autobahn = require('autobahn');
    var uuid = nconf.get('config:node:uuid');

    if (!uuid) {
        logger.info('First registration on the cloud')
        var token = nconf.get('config:node:token');
        url=nconf.get('config:iotronic:registration-agent:url');
        port=nconf.get('config:iotronic:registration-agent:port');
        realm=nconf.get('config:iotronic:registration-agent:realm');
        if (!token || !url || !port || !realm){
            logger.error("Wrong configuration, check setting.json\n");
            process.exit();
        }
        
        create_wamp_connection(url,port,realm, function(wampConnection){
            wampConnection.open();
        });
        
    }
    else {
        logger.info('Using the uuid: '+uuid)
        url=nconf.get('config:iotronic:command-agent:url');
        port=nconf.get('config:iotronic:command-agent:port');
        realm=nconf.get('config:iotronic:command-agent:realm');
        if ( !url || !port || !realm){
            logger.error("Wrong configuration, check setting.json\n");
            process.exit();
        }
        
        create_wamp_connection(url,port,realm, function(wampConnection){
            wampConnection.open();
        });
        
    }

}

///////////////////////////////////////////////////////////////////////////////////

function create_wamp_connection(url,port,wampRealm,cb){
    var wampUrl = url+":"+port+"/ws";
    logger.info("using token: "+token+' for connectiong to '+wampUrl)
    wampConnection = new autobahn.Connection({
        url: wampUrl,
        realm: wampRealm
    });
    
    wampConnection.onopen = function (session, details) {

        logger.debug('WAMP: Connection to WAMP server '+ url +':'+port+' created successfully!');
        logger.debug('WAMP: Connected to realm '+ wampRealm);
        logger.info('WAMP: Session ID: '+ session._id);
        logger.debug('Connection details: '+ JSON.stringify(details)); 
        
        manage_WAMP_connection(session, details)
        
    };
    
    //This function is called if there are problems with the WAMP connection
    wampConnection.onclose = function (reason, details) {
        
        logger.error('WAMP: Error in connecting to WAMP server!');
        logger.error('- Reason: ' + reason);
        logger.error('- Reconnection Details: ');
        logger.error("  - retry_delay:", details.retry_delay);
        logger.error("  - retry_count:", details.retry_count);
        logger.error("  - will_retry:", details.will_retry);

        if(wampConnection.isOpen){logger.info("WAMP: connection is open!");}
        else{logger.warn("WAMP: connection is closed!");}
        if(session.isOpen){logger.info("WAMP: session is open!");}
        else{logger.warn("WAMP: session is closed!");}

    };
    
    
    cb(wampConnection);
}

function manage_WAMP_connection (session, details){

    //Registering the board to the Cloud by sending a message to the connection topic
    if (!uuid){
        session.call('stack4things.register', [token, session._id]).then(
            function (response) {
                res=JSON.parse(response);
                logger.debug("Received config:"+JSON.stringify(res.config));
                res.config.forEach(function(cfg) {
                    logger.debug("Received config:"+cfg);
                    change_config(cfg.action, cfg.position, cfg.value);
                });            
                save_config(true);
            },
            function (error) {
                logger.error("Registration failed:", error);
            }
        );
    }
    else {
        
        session.call('stack4things.register_uuid', [uuid, session._id]).then(
            function (response) {
                logger.info("Registrated on Iotronic command wamp router");           
            },
            function (error) {
                logger.error("Registration failed:", error);
            }
        );
        
        //register callback
        session.register('stack4things.'+uuid+'.configure', configure_node);
        logger.debug('Registered '+'stack4things.'+uuid+'.configure');
        
    }
};

function configure_node(response){
    res=JSON.parse(response);
    logger.debug("Received new config:"+JSON.stringify(res.config));
    res.config.forEach(function(cfg) {
        logger.debug("Received config:"+cfg);
        change_config(cfg.action, cfg.position, cfg.value);
    });            
    save_config(true);
    return {'result':0}
}



function change_config(action,configuration,value){
    
    switch(action) {
    case 'remove':
        logger.info("Removing "+configuration+" with value "+value);
        nconf.clear(configuration);
        break;
    case 'add':
        logger.info("Adding "+configuration+" with value "+value);
        nconf.set(configuration, value); 
        break;
    case 'modify':
        logger.info("Modifing "+configuration+" with value "+value);
        nconf.set(configuration, value);
        break;
    case 'clear':
        logger.info("Clearing configuration");
        nconf.set('config', value);
        break;
    
    }
    
}

function save_config(reboot){
    nconf.save(function (err) {
        if (err) {
        logger.error(err.message);
        return;
        }
        logger.debug('Configuration saved successfully.');
        if (reboot){ 
            logger.info('Rebooting...');
            process.exit(3);
            
        }
    });
}