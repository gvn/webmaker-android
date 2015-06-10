var React = require('react');
var render = require('../../lib/render.jsx');
var api = require('../../lib/api.js');
var Card = require('../../components/card/card.jsx');
var Loading = require('../../components/loading/loading.jsx');
var router = require('../../lib/router');
var dispatcher = require('../../lib/dispatcher');

var Make = React.createClass({
  mixins: [router],
  getInitialState: function () {
    return {
      projects: [],
      loading: true
    };
  },
  componentDidUpdate: function (prevProps) {
    if (this.props.isVisible && !prevProps.isVisible) {
      this.load();
    }
  },
  componentDidMount: function () {
    this.load();
  },
  onError: function (err) {
    console.error(err);
    this.setState({loading: false});
  },
  onEmpty: function () {
    console.log('No projects found');
    this.setState({loading: false});
  },
  load: function () {

    // No user found, so nothing to load.
    if (!this.state.user) {
      return this.onEmpty();
    }

    this.setState({loading: true});

    api({
      uri: `/users/${this.state.user.id}/projects`
    }, (err, body) => {
      if (err) {
        return this.onError(err);
      }

      if (!body || !body.projects || !body.projects.length) {
        return this.onEmpty();
      }

      this.setState({
        loading: false,
        projects: body.projects
      });
    });
  },
  addProject: function () {
    var defaultTitle = 'My project';
    var user = this.state.user;

    if (!user) {
      return console.error('Tried to create project when no session was found');
    }

    this.setState({loading: true});
    api({
      method: 'post',
      uri: `/users/${user.id}/projects`,
      json: {
        title: defaultTitle
      }
    }, (err, body) => {
      if (err) {
        return this.onError(err);
      }
      if (!body || !body.project) {
        return this.onEmpty();
      }
      if (window.Android) {
        window.Android.trackEvent('Make', 'Create a Project', 'New Project Started');
        window.Android.setView('/users/' + user.id + '/projects/' + body.project.id);
      }

      body.project.author = body.project.author || user;

      this.setState({
        loading: false,
        projects: [body.project].concat(this.state.projects)
      });
    });
  },

  logout: function () {
    if (window.Android) {
      window.Android.clearUserSession();
      window.Android.setView('/login');
    }
  },

  cardActionClick: function (e) {
    dispatcher.fire('modal-switch:show', {
      config: {
        actions: ['Share', 'Delete'],
        callback: (event) => {
          if (event.label === 'Delete') {
            api({
              method: 'DELETE',
              uri: `/users/${this.state.user.id}/projects/${e.projectID}`
            }, (err, body) => {
              if (err) {
                return this.onError(err);
              }

              console.warn('Deleted project: ' + e.projectID);
              this.load();
            });
          } else if (event.label === 'Share') {
            // TODO
          }
        }
      }
    });
  },

  render: function () {

    var cards = this.state.projects.map(project => {
      return (
        <Card
          onActionsClick={this.cardActionClick}
          projectID={project.id}
          key={project.id}
          url={"/users/" + project.author.id + "/projects/" + project.id}
          href="/pages/project"
          thumbnail={project.thumbnail[320]}
          title={project.title}
          author={project.author.username} />
      );
    });

    return (
      <div id="make">
        <div className="profile-card">
          <h3>{this.state.user.username}</h3>
          <p><button className="btn" onClick={this.logout}>Log out</button></p>
        </div>
        <button onClick={this.addProject} className="btn btn-create btn-block btn-teal">
          + Create a Project
        </button>
        {cards}
        <Loading on={this.state.loading} />
      </div>
    );
  }
});

// Render!
render(Make);
