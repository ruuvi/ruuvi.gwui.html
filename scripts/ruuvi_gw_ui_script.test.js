/**
 * @author TheSomeMan
 * @copyright Ruuvi Innovations Ltd, license BSD-3-Clause.
 */

import * as ruuvi from './ruuvi_gw_ui_script.js';
// import { UiScript } from './ruuvi_gw_ui_script.js';
import chai from 'chai';
import sinon from 'sinon';
import yaml from "js-yaml";

const { expect } = chai;

describe('UiScript', () => {
  let sandbox;
  let consoleLogStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    consoleLogStub = sandbox.stub(console, 'log');
  })

  afterEach(() => {
    sandbox.restore();
  })

  it('should fail: the script is empty', () => {
    let yamlContent = `
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw("UiScript: the script is empty.");
  })

  it('should fail: pages is required', () => {
    let yamlContent = `
env:
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw("UiScript: 'pages' is required.");
  })

  it('should fail: pages cannot be empty', () => {
    let yamlContent = `
pages:
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw("UiScript: 'pages' cannot be empty.");
  })

  it('should fail: pages must be an array, got string instead', () => {
    let yamlContent = `
pages: abc
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScript: 'pages' must be an array, got 'string' instead.");
  })

  it('should fail: pages must be an array, got number instead', () => {
    let yamlContent = `
pages: 123
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScript: 'pages' must be an array, got 'number' instead.");
  })

  it('should fail: page must be a string, got number instead', () => {
    let yamlContent = `
pages:
  - page: 123
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptPage: 'page' or 'page?' must be a string, got 'number' instead.");
  })

  it('should fail: page must be a string, got array instead', () => {
    let yamlContent = `
pages:
  - page:
    - abc: def
    = abc: qwe
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptPage: 'page' or 'page?' must be a string, got 'object' instead.");
  })

  it('should test one mandatory page with no steps', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(0);
    }
  })

  it('should test one optional page with no steps', () => {
    let yamlContent = `
pages:
  - page?: "#page-auth"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.be.an('array');
    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', true);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(0);
    }
  })

  it('should fail: unknown root section', () => {
    let yamlContent = `
env:

pages:
  - page?: "#page-auth"
  
unknown_sect:
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScript: Unexpected key(s) found: 'unknown_sect'.");
  })

  it('should fail: page expected', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
  - unk: "#page-auth2"
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptPage: 'page' or 'page?' expected, got 'unk' instead.");
  })

  it('should fail: unknown page params', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    params:
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptPage: Unexpected key(s) found: 'params'.");
  })

  it('should test one page with 1 "do" step', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin');
      }
    }
  })

  it('should test one page with 1 "do" step with empty "params"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        params:
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin');
      }
    }
  })

  it('should test one page with 1 "do" step with non empty "params" with valid params', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        params:
          preClickDelay: '700'
          postClickDelay: 1500
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 700);
        expect(step.action_do).to.have.property('postClickDelay', 1500);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin');
      }
    }
  })

  it('should fail: "params" with array', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        params:
          - unknown: 1000
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptControlStatementDo: 'params' must be an object, got an array instead: '[object Object]'.");
  })

  it('should fail: "params" with invalid param', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        params:
          abcdef: 1000
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptControlStatementDo: Unexpected key(s) found in 'params': 'abcdef'.");
  })

  it('should fail: "params" with invalid param value', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        params:
          preClickDelay: '10abc'
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptActionDo: 'preClickDelay' must be a number, got 'number': 10abc.");
  })

  it('should fail: "do" with unknown extra data', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
        unknown:
          preClickDelay: 1000
`;
    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptControlStatementDo: Unexpected key(s) found: 'unknown'.");
  })


  it('should fail: "do" without control statement', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do:
        params:
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptControlStatementDo: 'do' must have argument of a string type, got 'object' instead: [object Object].");
  })

  it('should test one page with 2 "do" steps', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
      - do: fillInput "#auth-pass" "123456"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(2);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin');
      }
      {
        let step = page.steps.steps[1];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-pass');
        expect(step.action_do).to.have.property('value', '123456');
      }
    }
  })

  it('should test one page with 1 embedded "steps" with 2 "do" steps', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - steps:
        - do: fillInput "#auth-user" "Admin"
        - do: fillInput "#auth-pass" "123456"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let parent_step = page.steps.steps[0];
        expect(parent_step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(parent_step).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(parent_step).to.have.property('steps');
        expect(parent_step.steps).to.be.an('array');
        expect(parent_step.steps).to.have.lengthOf(2);
        {
          let sub_step = parent_step.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('preClickDelay', 1000);
          expect(sub_step.action_do).to.have.property('postClickDelay', 2000);
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin');
        }
        {
          let sub_step = parent_step.steps[1];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('preClickDelay', 1000);
          expect(sub_step.action_do).to.have.property('postClickDelay', 2000);
          expect(sub_step.action_do).to.have.property('selector', '#auth-pass');
          expect(sub_step.action_do).to.have.property('value', '123456');
        }
      }
    }
  })

  it('should test env substitution', () => {
    let yamlContent = `
env:
  username: "Admin123"
  
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "\${env:username}"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin123');
      }
    }
  })

  it('should test secrets and params substitution', () => {
    let yamlContent = `
env:
  username: "\${secrets:username}"
  
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "\${env:username}"
        params:
          preClickDelay: \${params:preClickDelay}
      - do: fillInput "#auth-pass" "\${secrets:password}"
`;

    const secrets = {
      username: "Admin124",
      password: "password124"
    };
    const params = {
      preClickDelay: 750,
    }
    const subst_obj = {
      secrets: secrets,
      params: params
    }

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj, subst_obj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(2);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 750);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin124');
      }
      {
        let step = page.steps.steps[1];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-pass');
        expect(step.action_do).to.have.property('value', 'password124');
      }
    }
  })

  it('should test overriding global parameters in env', () => {
    let yamlContent = `
env:
  navigationTimeout: 2015
  preClickDelay: 751
  postClickDelay: 957
  
pages:
  - page: "#page-auth"
    steps:
      - do: clickAndNavigate "#page-welcome-button-get-started"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoClickAndNavigate);
        expect(step.action_do).to.have.property('action_type', 'clickAndNavigate');
        expect(step.action_do).to.have.property('preClickDelay', 751);
        expect(step.action_do).to.have.property('postClickDelay', 957);
        expect(step.action_do).to.have.property('selector', '#page-welcome-button-get-started');
        expect(step.action_do).to.have.property('navigationTimeout', 2015);
      }
    }
  })

  it('should fail: "if" statement without "then"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
`;

    let yamlObj = yaml.load(yamlContent);

    expect(() => new ruuvi.UiScript(yamlObj)).to.throw(
        "UiScriptStepIf: 'then' expected after 'if'.");
  })

  it('should test "if" statement with "then"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        {
          let sub_step = step.then_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin');
        }
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if" statement with "then" and "else"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
          - do: fillInput "#auth-pass" "pass1"
        else:
          - do: fillInput "#auth-user" "Admin2"
          - do: fillInput "#auth-pass" "pass2"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(2);
        {
          let sub_step = step.then_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin');
        }
        {
          let sub_step = step.then_part.steps[1];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-pass');
          expect(sub_step.action_do).to.have.property('value', 'pass1');
        }
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(2);
        {
          let sub_step = step.else_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin2');
        }
        {
          let sub_step = step.else_part.steps[1];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-pass');
          expect(sub_step.action_do).to.have.property('value', 'pass2');
        }
      }
    }
  })

  it('should test "if" statement with one-line "then" and "else"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
        then: fillInput "#auth-user" "Admin"
        else: fillInput "#auth-user" "Admin2"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        {
          let sub_step = step.then_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin');
        }
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(1);
        {
          let sub_step = step.else_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepDo);
          expect(sub_step).to.have.property('action_do');
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
          expect(sub_step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
          expect(sub_step.action_do).to.have.property('action_type', 'fillInput');
          expect(sub_step.action_do).to.have.property('selector', '#auth-user');
          expect(sub_step.action_do).to.have.property('value', 'Admin2');
        }
      }
    }
  })

  it('should test nested "if" statement', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
        then:
          - if: isEnabled "#auth-pass"
            then: fillInput "#auth-user" "Admin1"
            else: fillInput "#auth-user" "Admin2"
        else:
          - if: isDisabled "#auth-pass"
            then: fillInput "#auth-user" "Admin3"
            else: fillInput "#auth-user" "Admin4"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        {
          let sub_step = step.then_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepIf);
          expect(sub_step).to.have.property('action_if');
          expect(sub_step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
          expect(sub_step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
          expect(sub_step.action_if).to.have.property('is_inverse', true);
          expect(sub_step.action_if).to.have.property('selector', '#auth-pass');
          expect(sub_step).to.have.property('then_part');
          expect(sub_step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
          expect(sub_step.then_part.steps).to.be.an('array');
          expect(sub_step.then_part.steps).to.have.lengthOf(1);
          {
            let sub_step2 = sub_step.then_part.steps[0];
            expect(sub_step2).to.be.instanceOf(ruuvi.UiScriptStep);
            expect(sub_step2).to.be.instanceOf(ruuvi.UiScriptStepDo);
            expect(sub_step2).to.have.property('action_do');
            expect(sub_step2.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
            expect(sub_step2.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
            expect(sub_step2.action_do).to.have.property('action_type', 'fillInput');
            expect(sub_step2.action_do).to.have.property('selector', '#auth-user');
            expect(sub_step2.action_do).to.have.property('value', 'Admin1');
          }
          expect(sub_step).to.have.property('else_part');
          expect(sub_step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
          expect(sub_step.else_part.steps).to.be.an('array');
          expect(sub_step.else_part.steps).to.have.lengthOf(1);
          {
            let sub_step3 = sub_step.else_part.steps[0];
            expect(sub_step3).to.be.instanceOf(ruuvi.UiScriptStep);
            expect(sub_step3).to.be.instanceOf(ruuvi.UiScriptStepDo);
            expect(sub_step3).to.have.property('action_do');
            expect(sub_step3.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
            expect(sub_step3.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
            expect(sub_step3.action_do).to.have.property('action_type', 'fillInput');
            expect(sub_step3.action_do).to.have.property('selector', '#auth-user');
            expect(sub_step3.action_do).to.have.property('value', 'Admin2');
          }
        }
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(1);
        {
          let sub_step = step.else_part.steps[0];
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step).to.be.instanceOf(ruuvi.UiScriptStepIf);
          expect(sub_step).to.have.property('action_if');
          expect(sub_step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
          expect(sub_step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
          expect(sub_step.action_if).to.have.property('is_inverse', false);
          expect(sub_step.action_if).to.have.property('selector', '#auth-pass');
          expect(sub_step).to.have.property('then_part');
          expect(sub_step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
          expect(sub_step.then_part.steps).to.be.an('array');
          expect(sub_step.then_part.steps).to.have.lengthOf(1);
          {
            let sub_step4 = sub_step.then_part.steps[0];
            expect(sub_step4).to.be.instanceOf(ruuvi.UiScriptStep);
            expect(sub_step4).to.be.instanceOf(ruuvi.UiScriptStepDo);
            expect(sub_step4).to.have.property('action_do');
            expect(sub_step4.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
            expect(sub_step4.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
            expect(sub_step4.action_do).to.have.property('action_type', 'fillInput');
            expect(sub_step4.action_do).to.have.property('selector', '#auth-user');
            expect(sub_step4.action_do).to.have.property('value', 'Admin3');
          }
          expect(sub_step).to.have.property('else_part');
          expect(sub_step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
          expect(sub_step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
          expect(sub_step.else_part.steps).to.be.an('array');
          expect(sub_step.else_part.steps).to.have.lengthOf(1);
          {
            let sub_step5 = sub_step.else_part.steps[0];
            expect(sub_step5).to.be.instanceOf(ruuvi.UiScriptStep);
            expect(sub_step5).to.be.instanceOf(ruuvi.UiScriptStepDo);
            expect(sub_step5).to.have.property('action_do');
            expect(sub_step5.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
            expect(sub_step5.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
            expect(sub_step5.action_do).to.have.property('action_type', 'fillInput');
            expect(sub_step5.action_do).to.have.property('selector', '#auth-user');
            expect(sub_step5.action_do).to.have.property('value', 'Admin4');
          }
        }
      }
    }
  })

  it('should test "if isInvisible"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isInvisible "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsInvisible);
        expect(step.action_if).to.have.property('is_inverse', false);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if isVisible"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isVisible "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsInvisible);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if isDisabled"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isDisabled "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', false);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if isEnabled"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: isEnabled "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfIsDisabled);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if hasNoClassDisableClick"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: hasNoClassDisableClick "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfHasClassDisableClick);
        expect(step.action_if).to.have.property('is_inverse', true);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "if hasClassDisableClick"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - if: hasClassDisableClick "#auth-user"
        then:
          - do: fillInput "#auth-user" "Admin"
`;

    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepIf);
        expect(step).to.have.property('action_if');
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIf);
        expect(step.action_if).to.be.instanceOf(ruuvi.UiScriptActionIfHasClassDisableClick);
        expect(step.action_if).to.have.property('is_inverse', false);
        expect(step.action_if).to.have.property('selector', '#auth-user');
        expect(step).to.have.property('then_part');
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.then_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.then_part.steps).to.be.an('array');
        expect(step.then_part.steps).to.have.lengthOf(1);
        expect(step).to.have.property('else_part');
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step.else_part).to.be.instanceOf(ruuvi.UiScriptStepSteps);
        expect(step.else_part.steps).to.be.an('array');
        expect(step.else_part.steps).to.have.lengthOf(0);
      }
    }
  })

  it('should test "do fillInput"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fillInput "#auth-user" "Admin"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFillInput);
        expect(step.action_do).to.have.property('action_type', 'fillInput');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('selector', '#auth-user');
        expect(step.action_do).to.have.property('value', 'Admin');
      }
    }
  })

  it('should test "do clickAndNavigate"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: clickAndNavigate "#auth-button-login"
        params:
          navigationTimeout: 5000
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoClickAndNavigate);
        expect(step.action_do).to.have.property('action_type', 'clickAndNavigate');
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
        expect(step.action_do).to.have.property('navigationTimeout', 5000);
        expect(step.action_do).to.have.property('selector', '#auth-button-login');
      }
    }
  })

  it('should test "do fail"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: fail "message 123"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoFail);
        expect(step.action_do).to.have.property('action_type', 'fail');
        expect(step.action_do).to.have.property('message', 'message 123');
      }
    }
  })

  it('should test "do waitUntilLoaded"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: waitUntilLoaded 25
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoWaitUntilLoaded);
        expect(step.action_do).to.have.property('action_type', 'waitUntilLoaded');
        expect(step.action_do).to.have.property('timeout', 25);
      }
    }
  })

  it('should test "do showAdvancedSettings"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: showAdvancedSettings "#page-cloud_options-advanced-button"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoShowAdvancedSettings);
        expect(step.action_do).to.have.property('action_type', 'showAdvancedSettings');
        expect(step.action_do).to.have.property('selector', "#page-cloud_options-advanced-button");
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

  it('should test "do hideAdvancedSettings"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: hideAdvancedSettings "#page-cloud_options-advanced-button"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoHideAdvancedSettings);
        expect(step.action_do).to.have.property('action_type', 'hideAdvancedSettings');
        expect(step.action_do).to.have.property('selector', "#page-cloud_options-advanced-button");
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

  it('should test "do selectRadio"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: selectRadio "#use_custom"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoSelectRadio);
        expect(step.action_do).to.have.property('action_type', 'selectRadio');
        expect(step.action_do).to.have.property('selector', "#use_custom");
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

  it('should test "do checkCheckbox"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: checkCheckbox "#use_mqtt"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoCheckbox);
        expect(step.action_do).to.have.property('action_type', 'checkCheckbox');
        expect(step.action_do).to.have.property('selector', "#use_mqtt");
        expect(step.action_do).to.have.property('setChecked', true);
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

  it('should test "do uncheckCheckbox"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: uncheckCheckbox "#use_mqtt"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoCheckbox);
        expect(step.action_do).to.have.property('action_type', 'uncheckCheckbox');
        expect(step.action_do).to.have.property('selector', "#use_mqtt");
        expect(step.action_do).to.have.property('setChecked', false);
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

  it('should test "do clickButton"', () => {
    let yamlContent = `
pages:
  - page: "#page-auth"
    steps:
      - do: clickButton "#page-custom_server-button-check"
`;
    let yamlObj = yaml.load(yamlContent);
    let uiScript;

    expect(() => uiScript = new ruuvi.UiScript(yamlObj)).not.to.throw();

    expect(uiScript.pages).to.have.lengthOf(1);
    {
      let page = uiScript.pages[0];
      expect(page).to.be.instanceOf(ruuvi.UiScriptPage);
      expect(page).to.have.property('page_url', '#page-auth');
      expect(page).to.have.property('is_url_optional', false);
      expect(page).to.have.property('steps');
      expect(page.steps).to.be.instanceOf(ruuvi.UiScriptStepSteps);
      expect(page.steps).to.have.property('steps');
      expect(page.steps.steps).to.be.an('array');
      expect(page.steps.steps).to.have.lengthOf(1);
      {
        let step = page.steps.steps[0];
        expect(step).to.be.instanceOf(ruuvi.UiScriptStep);
        expect(step).to.be.instanceOf(ruuvi.UiScriptStepDo);
        expect(step).to.have.property('action_do');
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDo);
        expect(step.action_do).to.be.instanceOf(ruuvi.UiScriptActionDoClickButton);
        expect(step.action_do).to.have.property('action_type', 'clickButton');
        expect(step.action_do).to.have.property('selector', "#page-custom_server-button-check");
        expect(step.action_do).to.have.property('preClickDelay', 1000);
        expect(step.action_do).to.have.property('postClickDelay', 2000);
      }
    }
  })

})

