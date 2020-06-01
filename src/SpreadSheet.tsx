import React, { Component } from "react";
import "@progress/kendo-theme-default/dist/all.css";
import "@progress/kendo-ui/";
import $ from "@progress/kendo-ui/node_modules/jquery";

interface PropsType {
  children: JSX.Element;
}

async function getData(url: string): Promise<any | string[]> {
  return $.ajax({
    url: "http://localhost:61909/" + url,
    method: "get",
  });
}

async function postData(url: string, data: any): Promise<any | string[]> {
  return $.ajax({
    url: "http://localhost:61909/" + url,
    method: "post",
    contentType: "application/json",
    data: JSON.stringify(data),
  });
}

function b64toBlob(dataURI: string) {
  var byteString = atob(dataURI.split(",")[1]);
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);

  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

class SpreadSheet extends Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);

    this.loadTemplateNames = this.loadTemplateNames.bind(this);
    this.handleSelectTemplate = this.handleSelectTemplate.bind(this);
    this.lockAllCells = this.lockAllCells.bind(this);
  }
  spread: any;
  logo = "";
  currentTemplateName = "";

  componentDidMount() {
    this.spread = $("#spreadsheet").kendoSpreadsheet();
    this.loadTemplateNames();
  }

  componentWillUnmount(){
    this.spread.getKendoSpreadsheet().destroy();
    $("#spreadsheet").empty();
  }

  async loadTemplateNames() {
    try {
      var names = await getData("SecondPage/GetTemplateNames");
      names.map((name: string) => {
        var option = document.createElement("option");
        option.text = name;
        $("#templateNames").append(option);
      });
    } catch (err) {
      console.log(err);
    }
  }

  handleSelectTemplate() {
    var selected: any = $("#templateNames option:selected").val();
    if ($("#bimarLogoCheckbox").is(":checked")) {
      this.logo = "bimar.jpg";
    } else {
      this.logo = "";
    }
    this.openTemplate(selected, this.logo);

    this.currentTemplateName = selected;

    // $("#nameInput").val("");
    // $("#nameInput").prop("disabled", false);

    // $("#dateInput").prop("disabled", false);

    // $("#saveButton").show();
    // $("#updateButton").hide();
    // $("#approveButton").show();
    // $("#exportProtectedButton").hide();
  }

  async openTemplate(name: string, logoName: string) {
    var url = "SecondPage/GetTemplateByName/";
    var data = { templateName: name, logoName: logoName };
    try {
      var response = await postData(url, data);
      console.log(response);
      var spreadsheet = this.spread.getKendoSpreadsheet();
      await spreadsheet.fromFile(b64toBlob(response));
      this.lockAllCells();
      // await unlockCells(name, true);
    } catch (err) {
      console.log(err);
    }
  }

  lockAllCells() {
    //A1 den CX200 e kadar olan celler disable edilir.
    var sheetList = this.spread.getKendoSpreadsheet().sheets();
    for (var i = 0; i < sheetList.length; i++) {
      var sheet = sheetList[i];
      var range = sheet.range("A1:CX200");
      range.enable(false);
    }
  }

  render() {
    return (
      <div style={{ marginTop: 10, height: 100 }}>
        {/* sol taragtaki seçim bölgesi */}
        <div
          id="controlBox"
          style={{ width: "20%", height: 700, float: "left" }}>
          <select
            id="templateNames"
            style={{ width: "100%", height: "35%", overflowX: "auto" }}
            multiple></select>
          <button
            id="selectTemplate"
            onClick={() => this.handleSelectTemplate()}>
            Open Template
          </button>
          <label>BimarLogo:</label>
          <input type="checkbox" id="bimarLogoCheckbox" />

          <hr />

          <select
            id="savedFileNames"
            style={{ width: "100%", height: "35%", overflowX: "auto" }}
            multiple></select>
          <button id="selectSavedFile" onClick={() => {}}>
            Open Saved File
          </button>
          <label>Readonly:</label>
          <input
            type="checkbox"
            onChange={() => {}}
            checked
            id="readonlyCheckbox"
          />
          <button id="openInNewTabButton" onClick={() => {}}>
            Open In New Tab
          </button>
        </div>

        <div style={{ width: "80%", float: "left" }}>
          <button onClick={() => {}} id="exportProtectedButton" hidden>
            Export Protected
          </button>
          <div>
            <div style={{ float: "left", marginLeft: "10px" }}>
              <label>Name:</label>
              <input type="text" id="nameInput"></input>
            </div>
            <div style={{ float: "left", marginLeft: "10px" }}>
              <label>Date:</label>
              <input
                type="date"
                id="dateInput"
                data-date-format="DD MMMM YYYY"></input>
            </div>
            <button
              onClick={() => {}}
              style={{ marginLeft: "10px" }}
              id="saveButton">
              Save
            </button>
            <button
              onClick={() => {}}
              style={{ marginLeft: "10px" }}
              id="updateButton"
              hidden>
              Update
            </button>
            <button
              onClick={() => {}}
              style={{ marginLeft: "10px" }}
              id="approveButton">
              Approve
            </button>
            <div
              id="spreadsheet"
              style={{ float: "left", width: "100%" }}></div>
          </div>
        </div>
      </div>
    );
  }
}

export default SpreadSheet;
