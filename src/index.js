const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const app = express()
const server = http.createServer(app)
const io = socketio(server)
const { generateMessages } = require('./utils/messages')
const { addUser, removeUser, getUser, getUserInRoom } =require('./utils/users')
const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

//let count = 0
io.on('connection', (socket)=>{
    console.log('New Connection')

    // socket.emit('countUpdated', count)
    //
    // socket.on('increment', ()=>{
    //     count++
    //     //socket.emit('countUpdated', count)   provide information to specific connection
    //     io.emit('countUpdated', count)
    // })


    socket.on('join', ({ username, room }, callback) =>{
        const { error, user } = addUser({ id:socket.id , username, room })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessages('Admin',`Welcome ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessages('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback)=>{

        const user = getUser(socket.id)

        const filter = new Filter()
        if(filter.isProfane(message))
        {
            return callback('Bad words are not allowed')
        }

        io.to(user.room).emit('message', generateMessages(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) =>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateMessages(user.username, `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', ()=>{
        const user =  removeUser(socket.id)

        if(user)
        {
            io.to(user.room).emit('message', generateMessages('Admin',`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users: getUserInRoom(user.room)
            })
        }
    })

})


server.listen(port, ()=>{
    console.log('Listening to ' + port)
})