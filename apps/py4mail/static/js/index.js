let app = {};

let init = (app) => {
  // This is the Vue data.
  app.data = {
    emails: [],
    emails_as_dict: {},
    searchQuery: '',
    mailOption: 0, // 0 = list, 1 = individual mail, 2 = sent list
    mail: {},
    emails_for_search: [],
    email_addresses: [],
    compose: 0,
    formData: {address:'', subject:'', emailContent:''},
  };

  app.enumerate = (a) => {
    // This adds an _idx field to each element of the array.
    let k = 0;
    a.map((e) => {
      e._idx = k++;
    });
    return a;
  };
  

  // This contains all the methods.
  app.methods = {
    formatEmailsByTime: function () {
      app.vue.emails.sort(function (a, b) {
        return new Date(b.sent_at) - new Date(a.sent_at);
      });
    },

    //One function that get the information for the three different types of mails
    //param of `type` to get the mails from inbox, trash, or starred
    getGlobal: function(type, isType) {
      app.vue.mailOption = 0;
      app.data.emails_as_dict = {};
      axios.get(get_emails_url).then(function(response) {
        app.vue.emails = app.enumerate(response.data.emails).filter(function(email) {
          if (email[isType] === type) {
            app.data.emails_as_dict[email.id] = email;
            return true;
          }
          return false;
        });
        app.methods.formatEmailsByTime();
      });
    },

    //get the mails from inbox
    getInbox: function() {
      app.methods.getGlobal(false, 'isTrash');
    },    
    getSent: function() {
      app.vue.mailOption = 2;
      axios.get(get_sent_url).then(function(response) {
        app.vue.emails = app.enumerate(response.data.emails);
        app.methods.formatEmailsByTime();
      });
    },
    //get the mails from trash
    getTrash: function() {
      app.methods.getGlobal(true, 'isTrash');
    },

    //get the mails from starred
    getStarred: function() { 
      app.methods.getGlobal(true, 'isStarred');
    },

    // view individual mail 
    viewMail: function(email_id) {
      app.vue.mailOption = 1; //switch to individual mail
      app.vue.mail = email_id;
    },
    compose_mail: function(email) {
      // use the api to send the email
      axios
      .post(get_compose_url, { email: { receiver_mail: email.receiver_mail, title: email.title, content: email.content } })
      .then(function(response) {
        if (response.data === "Mail sent successfully") {
          // app.methods.getInbox();
          console.log("Success");
        }      
      })
      .catch(function(error) {
        console.error(error);
      });
    },
    // trash or delete the email
    trashOrDeleteMail: function(email_id) {
      app.vue.emails.forEach(function(email){
        if (email.id === email_id) {
          if (email.isTrash === true) {
            axios.post(delete_url,
              {
                id: email.id,
              }).then(function(response) {
                app.vue.emails.splice(app.vue.emails.indexOf(email), 1);
                delete app.vue.emails_as_dict[email];
              });
          } else {
            axios.post(trash_url,
              {
                id: email.id,
              }).then(function(response) {
                app.vue.emails.indexOf(email).isTrash = true;
              });
          }
        }
      });
    },
    starMail: function(email_id) {
      axios.post(star_url,
        {
          id: email_id,
        }).then(function(response) {
          app.vue.emails.forEach(function(email){
            if (email.id === email_id) {
              if (email.isStarred === true) {
                email.isStarred = false;
              } else {
                email.isStarred = true;
              }
            }
          });
        });
    },
    openCompose: function() {
      app.vue.compose = 1;
    },
    closeCompose: function() {
      app.vue.compose = 0;
      app.vue.formData.address = '';
      app.vue.formData.emailContent = '';
      app.vue.formData.subject = '';
    },
    sendMail() {
      // Access the form data
      if (!app.vue.email_addresses.includes(app.vue.formData.address)) {
        window.alert("Not a valid email address");
      } else {
        const email = {
          receiver_mail: app.vue.formData.address,
          title: app.vue.formData.subject,
          content: app.vue.formData.emailContent
        };
        axios
          .post(get_compose_url, email)
          .then(function(response) {
            if (response.data === "Mail sent successfully") {
              app.methods.getInbox();
              console.log("Success!!");
            } else {
              console.log("Noooo");
            }
          })
          .catch(function(error) {
            console.error(error);
          });
        app.methods.closeCompose();
      }
    }
    
  };

  // This creates the Vue instance.
  app.vue = new Vue({
    el: "#vue-target",
    data: app.data,
    methods: app.methods,
    watch: {
      searchQuery: function(query) {
        console.log(app.data.searchQuery);
        if(app.data.searchQuery == "") {
          app.methods.getInbox();
        } else {
          var query = app.data.searchQuery.toLowerCase();
          app.vue.emails = app.vue.emails_for_search.filter(email => email.sender_name.toLowerCase().startsWith(query));
        }
      }
    },
  });

  // And this initializes it.
  app.init = () => {
    //get mails from inbox by default
    axios.get(get_emails_url).then(function(response) {
      app.vue.emails_for_search = app.enumerate(response.data.emails);
    });
    axios.get(get_users_url).then(function(response) {
      response.data.users.map(function(user) {
        app.vue.email_addresses.push(user.email);
      });
    })
    app.methods.getInbox();
  };

  // Call to the initializer.
  app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code in it.
init(app);

