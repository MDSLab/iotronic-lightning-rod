
var logger = null;

exports.init = function(module_path_name){
    
    try{
      
	module_name = module_path_name;
	/*
	//module_cfg = JSON.parse(fs.readFileSync('./modules/'+module_name+'/module_cfg.json', 'utf8'));
	module_cfg = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
	module_name = module_cfg['modules:'+module_name+':name'];
	*/
      
	//nconf.file ({file: './modules/'+module_name+'/module_cfg.json'});
	nconf.file ({file: './settings.json'});
	module_id = nconf.get('modules:'+module_name+':module_id');
	
	//service logging configuration: "managePlugins"   
	logger = log4js.getLogger(module_name);

	logger.info("Module name: "+module_name);
	logger.info("Module uuid: "+module_id);
	
	

	logger.info(exports.hello());

    }
    catch(err){
	console.log(' - Error:'+ err);
    }

    
  
}


exports.hello = function(args){
  
  var hellosays = "HELLO by " + uuid;
  
  return hellosays
  
}
 
 //This function exports all the functions in the module as WAMP remote procedure calls
exports.exportModuleCommands = function (session){
    
    //Register all the module functions as WAMP RPCs
    try{
	  session.register('stack4things.'+uuid+'.'+module_name, exports.hello);
	  
	  logger.info(module_name+' commands exported to Iotronic!');
	  
    }
    catch(err){
	    logger.error('Error exporting '+module_name+' commands: '+ err);
    }    
    
}
