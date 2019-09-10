'use babel';

import OSCSourceCodeSenderView from './osc-sourcecode-sender-view';
import { CompositeDisposable } from 'atom';

const osc = require('node-osc');
const diff = require('fast-diff');

let shift_flag = false, command_flag = false, control_flag = false;
let client, editor, view;
let change_event = false;
let run_event = false;
let pre_text = '';


export default {

  OSCSourceCodeSenderView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.OSCSourceCodeSenderView = new OSCSourceCodeSenderView(state.OSCSourceCodeSenderViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.OSCSourceCodeSenderView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'osc-sourcecode-sender:init': () => this.init(),
      'osc-sourcecode-sender:attachEditor': () => this.attachEditor(),
      'osc-sourcecode-sender:close': () => this.close()
    }));

    this.modalPanel.item.querySelector('#close').addEventListener('click', () => {
      this.modalPanel.hide();
    });
    this.modalPanel.item.querySelector('#send').addEventListener('click', () => {
      let host = this.modalPanel.item.querySelector('#host').value;
      let port = this.modalPanel.item.querySelector('#port').value;
      console.log('osc target : ', host, port);

      this.initOSC(host, port);
      this.modalPanel.hide();
    });

    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  },


  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.OSCSourceCodeSenderView.destroy();
  },


  serialize() {
    return {
      OSCSourceCodeSenderViewState: this.OSCSourceCodeSenderView.serialize()
    };
  },

  init() {
    this.close();
    this.modalPanel.show()
    console.log('OSCSourceCodeSender');
  },

  initOSC(host, port) {
    client = new osc.Client(host, port);

    if (!change_event) {
      this.attachEditor();
    }

    if (!run_event) {
      this.keyEvent();
    }
  },

  close() {
    if (client) client.kill();
    client = null;
    console.log('OSCSourceCodeSender closed');
  },

  keyEvent() {
    view = atom.views.getView(atom.workspace);

    view.addEventListener('keydown', (e) => {
      this.changeFlag(e.keyCode, true);
    });

    view.addEventListener('keyup', (e) => {
      this.changeFlag(e.keyCode, false);
    });
    run_event = true;
  },

  attachEditor() {
    editor = atom.workspace.getActiveTextEditor();
    // console.log(editor);

    editor.onDidChange(this.sendEditorText);
    change_event = true;
  },

  calcDiffText () {
    let diff_text = diff(pre_text, editor.getText());
    pre_text = editor.getText();
    return diff_text;
  },

  sendEditorText() {
    if (client) {
      client.send('/editor_text', editor.getText());
    }
  },

  sendRun () {
    let diffs = this.calcDiffText();
    diffs = diffs.filter(diff => diff[0]!==0);
    // console.log(diffs);
    client.send('/run', 1);
    client.send('/diff', diffs);
  },


  changeFlag (key, flag) {
    switch (key) {
      case 13:
        if ((shift_flag || command_flag || control_flag) && flag) {
          this.sendRun();
          // console.log("run");
        }
        break;
      case 16:
        shift_flag = flag;
        // console.log("shift", shift_flag);
        break;
      case 17:
        control_flag = flag;
        // console.log("control", control_flag);
        break;
      case 91:
        command_flag = flag;
        // console.log("command", command_flag);
        break;
      case 93:
        command_flag = flag;
        // console.log("command", command_flag);
        break;
      default:
        // console.log("key=", key, flag);
        break;
    }
  },
};
