const { response } = require("express");
const express = require("express");
var mongoose = require('mongoose')
var UserModel = require('./Database/userModel').UserModel;
var GroupModel = require('./Database/groupModel').GroupModel;
var MassageModel = require('./Database/massageModel').MassageModel;
const io = require("socket.io");

const app = express();


mongoose.set('strictQuery', false);
mongoose.connect('mongodb://root:VGLV2q7zWHHQddKlPxYadStT@mongodb:27017/my-app?authSource=admin',(err)=>{console.log('DataBase Connected...'+err)});
app.use(express.json());
app.get('/',(req,res)=>{
    res.send("Hello World");
});

app.post('/newgroup',async (req,res)=>{
    var new_group = GroupModel({
        groupname : req.body.name,
        groupid : 10000 + Math.floor(Math.random() * 90000),
        grouppassword: req.body.password,
        users : []
    });
    var group = await new_group.save()
    res.json(group);
});
app.post('/getallmessage',async (req,res)=>{
    username = req.query.username;
    var user = await UserModel.findOne({username:username});
    var groups = user.grouplist;
    var message_list = [];
    for(var i = 0;i < groups.length;i++){
        var messages = await MassageModel.find({to:groups[i]});
        messages.forEach(
            (element) => {
                message_list.push(element);
            }
        )
    }
    res.json(message_list);
})
app.post('/joingroup',async (req,res)=>{
    console.log(req.body.GroupId)
    console.log(req.body.username)
    group = await GroupModel.findOne({groupid:req.body.GroupId})
    user = await UserModel.findOne({username:req.body.username})
    groupList = user.grouplist;
    userList = group.users;
    if(userList.indexOf(req.body.username) == -1 && group.grouppassword == req.body.password){
        userList.push(req.body.username);
        groupList.push(req.body.GroupId);
        var response = await GroupModel.findOneAndUpdate({groupid:req.body.GroupId},{users:userList})
        await UserModel.findOneAndUpdate({username:req.body.username},{grouplist:groupList})
    }else{
        var response = {"status":403}
    }
    res.json(response)
})

app.post('/newuser',async (req,res)=>{
    var finduser = UserModel.findOne({username:req.query.username});
    if(finduser == null){
        return res.json({status:false})
    }
    var new_user = UserModel({
        username : req.query.username,
        password : req.query.password,
        fullname : req.query.fullname,
        socketlist : [],
        grouplist : []
    });

    var data = await new_user.save();
    return res.json({status:true})
});

app.post('/changeusername',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    const new_username = req.body.new_username;
    const response = UserModel.findOneAndUpdate({username:username,password:password},{username:new_username})
    res.json(response)
});

app.post('/changepassword',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    const new_password = req.body.new_password;
    const response = UserModel.findOneAndUpdate({username:username,password:password},{password:new_password});
    res.json(response)
});

app.post('/leftgroup',async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    const group_id = req.body.group_id;
    var grouplist = await UserModel.findOne({username:username,password:password})
    grouplist = grouplist.groupList;
    var userslist = await GroupModel.findOne({groupid:group_id});
    userslist = userslist.users;
    grouplist.splice(grouplist.indexOf(group_id),1);
    userslist.splice(userslist.indexOf(username),1);
    const response = await GroupModel.findOneAndUpdate({groupid:group_id},{users:userslist});
    await UserModel.findOneAndUpdate({username:username},{grouplist:grouplist});
    res.json(response);
});

app.post('/getgroups',async (req,res)=>{
    var username = req.query.username;
    console.log(req.body);
    var user = await UserModel.findOne({username:username});
    console.log(user);
    var group_list = user.grouplist;
    var groups = [];
    for(var i = 0;i<group_list.length;i++){
        groups.push(await GroupModel.findOne({groupid:group_list[i]}))
    }
    res.json(groups);
});

app.post('/getuser',async (req,res)=>{
    get_user = await UserModel.findOne({username:req.query.username})
    res.json(get_user)

});

const server = app.listen(80,(val)=>console.log("server is run!!!"));

const socket = io(server)

const connectGroup = socket.of('/socket')

connectGroup.on('connection',async (socket)=>{
    var username = socket.handshake.query.username;
    var user = await UserModel.findOne({username : username});
    var group_list = user.grouplist;
    var massageList = [];
    group_list.forEach(async (element,i) => {
        var response = await MassageModel.find({to:element})
        massageList = massageList.concat(response)
        if(i == group_list.length - 1){
            connectGroup.to(socket.id).emit('getallmassage',massageList)
        }
    });
    
    
    socket_list_user = user.socketlist;
    socket_list_user.push(socket.id)
    await UserModel.findOneAndUpdate({username:username},{socketlist:socket_list_user})
    
    socket.on('massage',async (msg)=>{
        const new_massage = MassageModel({
            text : msg.text,
            from : msg.from,
            to : msg.to,
            time: Date.now(),
            replay : msg.replay,
            id : msg.id
        });
        new_massage.save();
        var get_group = await GroupModel.findOne({groupid : msg.to})
        get_group = get_group.users;
        get_group.forEach( async (element) => {
            var users_socket = await UserModel.findOne({username:element})
            users_socket = users_socket.socketlist
            users_socket.forEach(element => {
                connectGroup.to(element).emit('massage',new_massage)
            });
        });
    })
    socket.on('disconnect',async()=>{
        var user = await UserModel.findOne({username : username});
        var socket_list_user = user.socketlist;
        socket_list_user.splice(socket_list_user.indexOf(socket.id),1);
        await UserModel.findOneAndUpdate({username:username},{socketlist:socket_list_user});
    })
}) 