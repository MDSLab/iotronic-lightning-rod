/*
 * 				   Apache License
 *                           Version 2.0, January 2004
 *                        http://www.apache.org/licenses/
 * 
 * Copyright (c) 2014 2015 2016 Dario Bruneo, Francesco Longo, Andrea Rocco Lotronto, Arthur Warnier, Nicola Peditto, Fabio Verboso
 */



function checkSettings(callback){

    
    try{
 
      	var check_response = null;
	
	//Loading configuration file
	nconf = require('nconf');
	nconf.file ({file: 'settings.json'});

	//main logging configuration                                                                
	log4js = require('log4js');
	log4js.loadAppender('file');    
	logfile = nconf.get('config:log:logfile');
	log4js.addAppender(log4js.appenders.file(logfile));  

	//service logging configuration: "main"                                                  
	logger = log4js.getLogger('main');  

	logger.info('##############################');  
	logger.info('  Stack4Things Lightning-rod');  
	logger.info('##############################');  

	  
	// LOGGING CONFIGURATION --------------------------------------------------------------------
	loglevel = nconf.get('config:log:loglevel');

	/*
	OFF	nothing is logged
	FATAL	fatal errors are logged
	ERROR	errors are logged
	WARN	warnings are logged
	INFO	infos are logged
	DEBUG	debug infos are logged
	TRACE	traces are logged
	ALL	everything is logged
	*/

	if (loglevel === undefined){
	  logger.setLevel('INFO');
	  logger.warn('[SYSTEM] - LOG LEVEL not defined... default has been set: INFO'); 
	  
	}else if (loglevel === ""){
	  logger.setLevel('INFO');
	  logger.warn('[SYSTEM] - LOG LEVEL not specified... default has been set: INFO'); 
	
	}else{
	  logger.setLevel(loglevel);
	  
	}

	
	logger.info('[SYSTEM] - LOG LEVEL: ' + loglevel); 
	//------------------------------------------------------------------------------------------
	
	// NODE ANALYSIS
	uuid = nconf.get('config:node:uuid'); 
	token = nconf.get('config:node:token');  
		
	if ( uuid == undefined || uuid == ""){
	  
	  logger.debug('[SYSTEM] - Board uuid undefined or not specified! - uuid value: ' + uuid);
	  
	  if (token == undefined || token == ""){
	  
	    logger.error('[SYSTEM] - Board to be registered without token!'); 
	    check_response = false;
	    process.exit();

	  }
	  else{
	    logger.info('[SYSTEM] - Board to be registered with token ' + token);
	    check_response = true;
	    registration = true;
	  }
	
	}else {
	  logger.info('[SYSTEM] - Board registered with parameters:'); 
	  logger.info('[SYSTEM] ...uuid -> ' + uuid); 
	  if (token != "") logger.info('[SYSTEM] ...token -> ' + token);
	}

	
	// IOTRONIC ANALYSIS
	var iotronic_cfg_list = ['registration-agent', 'command-agent'];
	var agent_cfg_list = ['url', 'realm', 'port'];
	
	logger.debug('[SYSTEM] - Iotronic parameters:'); 
	
	iotronic_cfg_list.forEach(function(iotronic_param) {
	      
	      
	      
	      if ( (registration === true && iotronic_param === 'registration-agent') || (registration === false && iotronic_param === 'command-agent') ){
		
		  logger.debug('[SYSTEM] ...'+iotronic_param+' analysing...'); 
		  
		  agent_cfg_list.forEach(function(agent_param) {

			//logger.debug('[SYSTEM] ......'+agent_param+' analysing...'); 
			try{   
			  
			    value = nconf.get('config:iotronic:'+iotronic_param+':'+agent_param);

			    if (value === undefined){
			      logger.warn('[SYSTEM] ......'+agent_param+' not defined!'); 
			      check_response = false;
			      
			    }else if (value === ""){
			      logger.warn('[SYSTEM] ......'+agent_param+' not specified!'); 
			      check_response = false;
			    
			    }else{
			      logger.debug('[SYSTEM] ......'+agent_param+' -> '+ value); 
			      if(check_response != false) check_response = true;
	    
			      if(registration === false) registration = true;
					  
			    }	
			    
			    
			}
			catch(err){
			    logger.error('[SYSTEM] - Error in parsing settings.json: '+ err);
			    check_response = false;

			}      
		  
		  });
	      }
	  
	});
	
	callback(check_response);	
	
	
	
	
	
	
	
	
	
    }
    catch(err){
	// DEFAULT LOGGING
	log4js = require('log4js');
	log4js.loadAppender('file');    
	logfile = './s4t-lightning-rod.log';
	log4js.addAppender(log4js.appenders.file(logfile));  

	//service logging configuration: "main"                                                  
	logger = log4js.getLogger('main');  
	
	logger.error('[SYSTEM] - '+ err);
	process.exit();

    }  
	  

    

  
}



var cluster = require('cluster');
if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', function(worker, code, signal) {
    if (code==3) cluster.fork();
  });
}

if (cluster.isWorker) {

    // GLOBAL VARIABLES
    token = null;		//Used only for the registration process
    autobahn = null;
    uuid = null;		//Used after the registration
    logger = null;
    registration = false;	//By default set to false; It will be set at true only during the registration process...after that it will come back to be false.


    checkSettings(function(check){
  
      if(check === true){
	  
	
	  autobahn = require('autobahn');
	  uuid = nconf.get('config:node:uuid');

	  if (!uuid) {
	    
	      // FIRST REGISTRATION
	      logger.info('[SYSTEM] - First registration on the cloud!')
	      token = nconf.get('config:node:token');
	      url=nconf.get('config:iotronic:registration-agent:url');
	      port=nconf.get('config:iotronic:registration-agent:port');
	      realm=nconf.get('config:iotronic:registration-agent:realm');
	      
	      
	      create_wamp_connection(url,port,realm, function(wampConnection){
		  wampConnection.open();
	      });
	      
	  }
	  else {
	    
	      logger.info('[SYSTEM] - Board UUID: ' + uuid);
	      url=nconf.get('config:iotronic:command-agent:url');
	      port=nconf.get('config:iotronic:command-agent:port');
	      realm=nconf.get('config:iotronic:command-agent:realm');

	      
	      create_wamp_connection(url,port,realm, function(wampConnection){
		  wampConnection.open();
	      });
	      
	  }	
	
	
      }else{
	  logger.error('[SYSTEM] - Wrong configuration, check setting.json!\n')
      }
      
    });




}

///////////////////////////////////////////////////////////////////////////////////

function create_wamp_connection(url,port,wampRealm,cb){
  
    var wampUrl = url+":"+port+"/ws";
    
    if (token != null && uuid === undefined)
      logger.info("[SYSTEM] - Registration token: "+token+' for connectiong to '+wampUrl);
    
    wampConnection = new autobahn.Connection({
        url: wampUrl,
        realm: wampRealm
    });
    
    wampConnection.onopen = function (session, details) {

        logger.info('[WAMP] - Connection to WAMP server '+ url +':'+port+' created successfully!');
        logger.info('[WAMP] - Connected to realm '+ wampRealm);
        logger.info('[WAMP] - Session ID: '+ session._id);
        logger.debug('[WAMP] - Connection details:\n'+ JSON.stringify(details)); 
        
        manage_WAMP_connection(session, details)
        
    };
    
    //This function is called if there are problems with the WAMP connection
    wampConnection.onclose = function (reason, details) {
        
        logger.error('[WAMP] - Error in connecting to WAMP server!');
        logger.error(' - Reason: ' + reason);
        logger.error(' - Reconnection Details: ');
        logger.error(' - retry_delay:', details.retry_delay);
        logger.error(' - retry_count:', details.retry_count);
        logger.error(' - will_retry:', details.will_retry);

        if(wampConnection.isOpen){logger.info("WAMP: connection is open!");}
        else{logger.warn("[WAMP] - connection is closed!");}
        if(session.isOpen){logger.info("WAMP: session is open!");}
        else{logger.warn("[WAMP] - session is closed!");}

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
                    logger.debug("Received config:"+JSON.stringify(cfg));
                    change_config(cfg.action, cfg.position, cfg.value);
                });            
                save_config(true);
            },
            function (error) {
                logger.error("Registration failed:", error);
		//BACKOFF EXP
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
		process.exit();
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