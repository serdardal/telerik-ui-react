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
    this.unlockCells = this.unlockCells.bind(this);
    this.lockShipParticularCells = this.lockShipParticularCells.bind(this);
    this.handleSaveButton = this.handleSaveButton.bind(this);
    this.export = this.export.bind(this);
  }
  spread: any;
  logo = "";
  currentTemplateName = "";
  dataCellTables: any;
  notNullCellTables: any;
  endMarks: any;
  customFormattedCellTables: any;

  componentDidMount() {
    var _export = this.export;

    this.spread = $("#spreadsheet").kendoSpreadsheet({
      excelExport: function (e:any){
        _export(e);
      }
    });
    this.loadTemplateNames();
  }

  async export(e:any){
    var fileName = $("#nameInput").val();
    if (this.currentTemplateName !== "") {
        fileName = this.currentTemplateName.replace(".xlsx", "") + "_" + $("#nameInput").val() + "_" + $("#dateInput").val();
    }

    // Prevent the default behavior which will prompt the user to save the generated file.
    e.preventDefault();

    //resimlerin kaldırılması
    //resimler kaldırılmadan toDataURL() çalıştırılırsa patlıyor
    var sheets = e.workbook.sheets;
    for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        sheet.drawings = [];
    }

    // Get the Excel file as a data URL.
    var workbook = new kendo.ooxml.Workbook(e.workbook);
    var dataURL = workbook.toDataURL();

    // Strip the data URL prologue.
    var base64 = dataURL.split(";base64,")[1];

    var logoName = this.logo === "" ? null : this.logo;

    var url = "/SecondPage/SaveFileToTemp"
    var data = { base64: base64, fileName: fileName, logoName: logoName };

    // Post the base64 encoded content to the server which can save it.
    try {
        await postData(url, data);
        window.location.reload(false);
    }
    catch (e) {
        console.log(e);
    }
    
}

  componentWillUnmount() {
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

    $("#nameInput").val("");
    $("#nameInput").prop("disabled", false);

    $("#dateInput").prop("disabled", false);

    $("#saveButton").show();
    $("#updateButton").hide();
    $("#approveButton").show();
    $("#exportProtectedButton").hide();
  }

  handleSaveButton() {
    var inputRes = this.checkInputs();
    if (inputRes) {
        this.spread.getKendoSpreadsheet().saveAsExcel();
    }
  }

  async openTemplate(name: string, logoName: string) {
    var url = "SecondPage/GetTemplateByName/";
    var data = { templateName: name, logoName: logoName };
    try {
      var response = await postData(url, data);
      var spreadsheet = this.spread.getKendoSpreadsheet();
      await spreadsheet.fromFile(b64toBlob(response));
      this.lockAllCells();
      this.unlockCells(name, true);
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

  async unlockCells(docName: string, isTemplate: boolean) {
    var data = { documentName: docName, isTemplate: isTemplate };
    try {
      var response = await postData("SecondPage/GetUnlockedCells/", data);
      var sheetList = this.spread.getKendoSpreadsheet().sheets();

      //merge olmayan data hücrelerin enable edilmesi
      for (var k = 0; k < sheetList.length; k++) {
        var cellList = response.notMergedDataCellTables[k].cellList;
        var sheet = sheetList[k];

        for (var i = 0; i < cellList.length; i++) {
          //Telerik Spreadsheets hücre indexleri 0 dan başlıyor fakat EPPlus'ta 1 den başlıyor
          //bu nedenle 1 çıkarıyoruz.
          var range = sheet.range(
            cellList[i].rowIndex - 1,
            cellList[i].columnIndex - 1
          );
          range.enable(true);
        }
      }

      //merge edilmiş data hücrelerin enable edilmesi
      //sadece veri yazılacak hücreyi (sol üst hücre) enable etmek yeterli olmuyor.
      //merge edilmiş tüm hücrelerin enable edilmesi gerekiyor.
      var mergedTables = response.mergedRangesTables;

      for (var k = 0; k < sheetList.length; k++) {
        var mergedAddressList = mergedTables[k].mergedCellList;
        var sheet = sheetList[k];

        for (var i = 0; i < mergedAddressList.length; i++) {
          var range = sheet.range(mergedAddressList[i]);
          range.enable(true);
        }
      }

      //ship particular hücrelerin disable edilmesi
      var shipParticularCells = response.shipParticularCellTables;
      this.lockShipParticularCells(shipParticularCells);

      //değişkenlerin atanması
      this.dataCellTables = response.notMergedDataCellTables;
      for (var i = 0; i < this.dataCellTables.length; i++) {
        this.dataCellTables[i].cellList = this.dataCellTables[
          i
        ].cellList.concat(response.mergedDataCellTables[i].cellList);
      }
      this.notNullCellTables = response.notNullCellTables;
      this.endMarks = response.endMarks;
      this.customFormattedCellTables = response.customFormattedCellTables;
      // findNotNullCellValidations();
    } catch (err) {}
  }

  lockShipParticularCells(shipParticularCells: any) {
    var sheetList = this.spread.getKendoSpreadsheet().sheets();

    for (var i = 0; i < sheetList.length; i++) {
      var sheet = sheetList[i];
      var shipParticularCellList = shipParticularCells[i].cellList;

      for (var j = 0; j < shipParticularCellList.length; j++) {
        var range = sheet.range(
          shipParticularCellList[j].rowIndex - 1,
          shipParticularCellList[j].columnIndex - 1
        );
        range.enable(false);
      }
    }
  }

  checkInputs() {
    if ($("#nameInput").is(":enabled")) {
        var fileName = $("#nameInput").val();
        if (fileName === undefined || fileName === "") {
            window.alert("Name cannot be empty!");
            return false;
        }
    }
    
    if ($("#dateInput").is(":enabled")) {
        var date = $("#dateInput").val();
        if (date === undefined || date === "") {
            window.alert("Date cannot be empty!");
            return false;
        }
    }
    
    return true;
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
              onClick={() => {this.handleSaveButton()}}
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
