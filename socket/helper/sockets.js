var logger = require('../../api/service/logger');
const { User } = require('./../../api/models/user');
const Table = require('./../../api/models/table');

class Sockets {
    constructor() {
        this.currentUsers = [];
    }

    updateSocket(id, socket) {
        var flag = false;
        for (var i = 0; i < this.currentUsers.length; i++) {
            if (this.currentUsers[i].data_id.equals(id)) {
                flag = true;
                this.currentUsers[i].socket = socket.id;
                this.currentUsers[i].socketIS = socket;
                this.currentUsers[i].status = 'online';
                this.currentUsers[i].last_seen = 0;
            } else {
                // logger.info(`${this.currentUsers[i].data_id} is not same as ${id}`);
            }
        }

        if (!flag) {
            this.currentUsers.push({
                data_id: id,
                socket: socket.id,
                socketIS: socket,
                status: 'online',
                last_seen: 0
            });
        }

        // logger.info("SOCKETS",this.currentUsers);
        return true;
    }

    getSocket(id) {
        for (var i = 0; i < this.currentUsers.length; i++) {
            console.log("getSocket >>>", typeof this.currentUsers[i].data_id,typeof id,this.currentUsers[i].data_id.toString() == id.toString())
            if (this.currentUsers[i].data_id.toString() == id.toString()) {
                return this.currentUsers[i].socket;
            } else {
                // logger.info(this.currentUsers[i].data_id + ' != ' + id);
            }
        }
        return false;
    }

    getSocketIS(id) {
        for (var i = 0; i < this.currentUsers.length; i++) {
            console.log(this.currentUsers[i].data_id,id,this.currentUsers[i].socketIS)
            if (this.currentUsers[i].data_id == id) {
                return this.currentUsers[i].socketIS;
            }
        }
        return false;
    }

    getStatus(id) {
        for (var i = 0; i < this.currentUsers.length; i++) {
            if (this.currentUsers[i].data_id.equals(id)) {
                return { status: this.currentUsers[i].status, last_seen: this.currentUsers[i].last_seen };
            } else {
                // logger.info(`${this.currentUsers[i].data_id} is not same as ${id}`);
            }
        }
        return false;
    }

    userGone(id) {
        for (var i = 0; i < this.currentUsers.length; i++) {
            if (this.currentUsers[i].socket == id) {
                this.currentUsers[i].status = 'offline';
                this.currentUsers[i].last_seen = new Date().getTime();
                // logger.info(this.currentUsers);
            }
        }
    }

    getId(socket) {
        for (var i = 0; i < this.currentUsers.length; i++) {
            if (this.currentUsers[i].socket == socket) {
                // logger.info(this.currentUsers);
                return this.currentUsers[i].data_id.toString();
            }
        }
        return false;
    }
   
    async  sleep(ms) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve();
          }, ms);
        });
    }
}

module.exports = { Sockets };
