
var logger = null;

exports.init = function(path_name){
    
    try{
      
	modulen_cfg = JSON.parse(fs.readFileSync('./modules/'+path_name+'/module_cfg.json', 'utf8'));
	module_name = modulen_cfg['name'];
	/*
	nconf.file ({file: './modules/'+path_name+'/module_cfg.json'});
	var module_name = nconf.get('name');
	*/
	//service logging configuration: "managePlugins"   
	logger = log4js.getLogger(module_name);

	logger.info("Module name: "+module_name);

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
