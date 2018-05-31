const express = require('express') ;
var app = express() ;
var port = process.env.PORT || 7000 ;
var admin = require('firebase-admin') ;
var bodyParser = require('body-parser') ;
var serviceAccount = require("./serviceAccountKey.json");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://kanari-test.firebaseio.com"
});

//var fapp = admin.initializeApp() ;

var db = admin.database()
var root = db.ref() ;
var teams = root.child("teams") ;
var playerListRef = root.child("players") ;

app.get('/',function(req,res){
    res.send('Test endpoints for demonstrating CRUD operations')
}) ;

var errorHandler = function(error,res){
        var response = {} ;
        if(error) {
        response = {status:0,message:'Failed to save data'}
        }else{
        response = {status:1,message:'Data saved successfully'} ;
        }
    res.send(response) ;
}

var validateKey = function(key,res,message) {
    if(message === undefined || message === null) {
        message = "Id missing !" ;
    }
    if(key === undefined || key === null) {
        res.send({status:0,message:message})
    }
}

app.post('/createTeam',function(req,res){
    var team = req.body ;
    var response = {} ;
    var keyRef = teams.push()
    keyRef.set(team,function(error){
        if(!error) {
            res.send({status:1,message:keyRef.key})
        }else{
            errorHandler(error,res) ;
        }
    }) ;
    
})

app.post('/updateTeam',function(req,res){
    var team = req.body ;
    var key = team.key ;
    validateKey(key,res,"Team Id missing!")
    delete team.key ;
    var teamRef = teams.child(key)
    teamRef.update(team , function(error){
        errorHandler(error,res) ;
    }) ;
    
}) ;

teams.on('child_removed',function(data){
    var teamId = data.key ;
    console.log(teamId) ;
    playerListRef.orderByChild('teamId').equalTo(teamId)
        .once('value',function(snap){
        var playersObj = snap.val() ;
        console.log(playersObj) ;
        for(playerId in playersObj) {
            playerListRef.child(playerId).update({teamId:0})
        }
    }) 
}) ;

app.post('/deleteTeam',function(req,res) {
    var team = req.body ;
    var key = team.key ;
    validateKey(key,res,"Team Id missing!")
    var teamRef = teams.child(key)
    teamRef.set(null,function(error){
        errorHandler(error,res) ;
    }) ;
}) ;

app.get('/readTeams',function(req,res){
    teams.once('value',function(data) {
       res.send(data.val())
   }) 
});

playerListRef.on('child_added',function(data) {
    var playerData = data.val() ;
    var players = teams.child(playerData.teamId).child("players")
    players.child(data.key).set(playerData) ;
}) ;

app.post('/createPlayer',function(req,res) {
    var player = req.body ;
     
    if(player.teamId === undefined || player.teamId === null) {
        player.teamId = 0 ;
    }
    var playerIdRef = playerListRef.push() ;
    var playerId = playerIdRef.key ;
    playerIdRef.set(player,function(error){
            if(!error) {
                res.send({status:1,message:playerId}) ;
            }else{
                errorHandler(error,res) ;
            }
        }) ;
}) ;

playerListRef.on('child_changed',function(data){
    var player = data.val() ;
    var key = data.key ;
    var teamId = player.teamId ;
    var players = teams.child(teamId).child("players") ;
    var playerRef = players.child(key)
    playerRef.update(player,function(error){
        if(error) {
            console.log("Failed to update the player in team list")
        }
    }) ;
    

}) ;

app.post('/updatePlayer',function(req,res) {
    var player = req.body ;
    var key = player.key ;
    
    validateKey(key,res,"Player Id missing!") ;
    delete player.key ;
    var teamId = player.teamId ;
    playerListRef.child(key).update(player,function(error){
        errorHandler(error,res)
        }) ;
    }) ;

playerListRef.on("child_removed",function(data){
    var player = data.val() ;
    teams.child(player.teamId).child("players").child(data.key)
        .set(null,function(error){
        if(error) {
            console.log("Failed to delete data from team list for key"+ data.key + JSON.stringify(player) )    
        }
        
    }) ;
})

app.post('/deletePlayer',function(req,res) {
    var player = req.body ;
    var key = player.key ;
    validateKey(key,res,"Player Id missing!") ;
    var playerRef = playersListRef.child(key)
    playerRef.set(null,function(error){
        errorHandler(error,res) ;
    }) ;
}) ;

app.get('/readPlayers',function(req,res){
    
    playerListRef.once('value',function(data) {
       res.send(data.val())
   }) 
});



app.listen(port) ;