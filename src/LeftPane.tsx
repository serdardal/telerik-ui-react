import React, { Component } from "react";
import $ from "jquery";

const BASE_URL = "http://10.35.106.61";

async function getData(url: string): Promise<any | string[]> {
  return $.ajax({
    url: `${BASE_URL}/${url}`,
    method: "get",
  });
}

async function postData(url: string, data: any): Promise<any | string[]> {
  return $.ajax({
    url: `${BASE_URL}/${url}`,
    method: "post",
    contentType: "application/json",
    data: JSON.stringify(data),
  });
}

function b64toBlob(dataURI: string) {
  const byteString = atob(dataURI.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

interface States {
  templateNames: string[];
  selectedTemplate: string | undefined;
  savedFileNames: string[];
}

class LeftPane extends Component<{}, States> {
  constructor(props: {}) {
    super(props);

    this.lockAllCells = this.lockAllCells.bind(this);
    this.unlockCells = this.unlockCells.bind(this);
    this.lockShipParticularCells = this.lockShipParticularCells.bind(this);
    this.handleSaveButton = this.handleSaveButton.bind(this);
    this.handleSelectSavedFile = this.handleSelectSavedFile.bind(this);
    this.openSavedFileReadOnly = this.openSavedFileReadOnly.bind(this);
    // this.colorCustomFormattedCells = this.colorCustomFormattedCells.bind(this);
    this.openSavedFileEditMode = this.openSavedFileEditMode.bind(this);
    this.handleUpdateButton = this.handleUpdateButton.bind(this);

    this.state = {
      templateNames: [],
      selectedTemplate: undefined,
      savedFileNames: [],
    };
  }

  spread: any;
  logo = "";
  currentTemplateName = "";
  dataCellTables: any;
  notNullCellTables: any;
  endMarks: any;
  customFormattedCellTables: any;

  componentDidMount() {
    this.loadTemplateNames();
    this.loadSavedFileNames();
  }

  loadTemplateNames = async () => {
    try {
      const templateNames = await getData("SecondPage/GetTemplateNames");
      this.setState({ templateNames });
    } catch (err) {
      console.log(err);
    }
  };

  loadSavedFileNames = async () => {
    try {
      const savedFileNames = await getData(
        "SecondPage/GetSavedFileNamesFromDB"
      );
      this.setState({ savedFileNames });
    } catch (err) {
      console.log(err);
    }
  };

  handleOpenTemplate = () => {
    const selected: any = $("#templateNames option:selected").val();
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
  };

  handleSelectSavedFile() {
    const readonly = $("#readonlyCheckbox").is(":checked");
    const selected: any = $("#savedFileNames option:selected").val();
    if (readonly) {
      this.openSavedFileReadOnly(selected);
      $("#updateButton").hide();
      $("#exportProtectedButton").show();
      $("#approveButton").hide();
    } else {
      this.openSavedFileEditMode(selected);
      $("#updateButton").show();
      $("#exportProtectedButton").hide();
      $("#approveButton").show();
    }

    this.currentTemplateName = "";

    $("#nameInput").val(selected);
    $("#nameInput").prop("disabled", true);

    $("#dateInput").prop("disabled", true);

    $("#saveButton").hide();

    this.logo = "";
  }

  handleSaveButton() {
    const inputRes = this.checkInputs();
    if (inputRes) {
      this.spread.getKendoSpreadsheet().saveAsExcel();
    }
  }

  handleUpdateButton() {
    this.spread.getKendoSpreadsheet().saveAsExcel();
  }

  async openTemplate(name: string, logoName: string) {
    const url = "SecondPage/GetTemplateByName/";
    const data = { templateName: name, logoName: logoName };
    try {
      const response = await postData(url, data);
      const spreadsheet = this.spread.getKendoSpreadsheet();
      await spreadsheet.fromFile(b64toBlob(response));
      this.lockAllCells();
      this.unlockCells(name, true);
    } catch (err) {
      console.log(err);
    }
  }

  async openSavedFileReadOnly(name: string) {
    const url = "SecondPage/GetSavedFileByName/" + name;
    const customCellsUrl = "SecondPage/GetCustomFormattedCellsByName/" + name;

    try {
      const response = await getData(url);
      await this.spread.getKendoSpreadsheet().fromFile(b64toBlob(response));
      this.lockAllCells();
      const customCellsResponse = await getData(customCellsUrl);
      this.customFormattedCellTables = customCellsResponse;
      // this.colorCustomFormattedCells();
    } catch (err) {
      console.log(err);
    }
  }

  async openSavedFileEditMode(name: string) {
    const url = "SecondPage/GetSavedFileByName/" + name;

    try {
      const response = await getData(url);
      await this.spread.getKendoSpreadsheet().fromFile(b64toBlob(response));
      this.lockAllCells();
      await this.unlockCells(name, false);
      // colorCustomFormattedCells();
    } catch (err) {
      console.log(err);
    }
  }

  lockAllCells() {
    //A1 den CX200 e kadar olan celler disable edilir.
    const sheetList = this.spread.getKendoSpreadsheet().sheets();
    for (let i = 0; i < sheetList.length; i++) {
      const sheet = sheetList[i];
      const range = sheet.range("A1:CX200");
      range.enable(false);
    }
  }

  async unlockCells(docName: string, isTemplate: boolean) {
    const data = { documentName: docName, isTemplate: isTemplate };
    try {
      const response = await postData("SecondPage/GetUnlockedCells/", data);
      const sheetList = this.spread.getKendoSpreadsheet().sheets();

      //merge olmayan data hücrelerin enable edilmesi
      for (let k = 0; k < sheetList.length; k++) {
        const cellList = response.notMergedDataCellTables[k].cellList;
        const sheet = sheetList[k];

        for (let i = 0; i < cellList.length; i++) {
          //Telerik Spreadsheets hücre indexleri 0 dan başlıyor fakat EPPlus'ta 1 den başlıyor
          //bu nedenle 1 çıkarıyoruz.
          const range = sheet.range(
            cellList[i].rowIndex - 1,
            cellList[i].columnIndex - 1
          );
          range.enable(true);
        }
      }

      //merge edilmiş data hücrelerin enable edilmesi
      //sadece veri yazılacak hücreyi (sol üst hücre) enable etmek yeterli olmuyor.
      //merge edilmiş tüm hücrelerin enable edilmesi gerekiyor.
      const mergedTables = response.mergedRangesTables;

      for (let k = 0; k < sheetList.length; k++) {
        const mergedAddressList = mergedTables[k].mergedCellList;
        const sheet = sheetList[k];

        for (let i = 0; i < mergedAddressList.length; i++) {
          const range = sheet.range(mergedAddressList[i]);
          range.enable(true);
        }
      }

      //ship particular hücrelerin disable edilmesi
      const shipParticularCells = response.shipParticularCellTables;
      this.lockShipParticularCells(shipParticularCells);

      //değişkenlerin atanması
      this.dataCellTables = response.notMergedDataCellTables;
      for (let i = 0; i < this.dataCellTables.length; i++) {
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
    const sheetList = this.spread.getKendoSpreadsheet().sheets();

    for (let i = 0; i < sheetList.length; i++) {
      const sheet = sheetList[i];
      const shipParticularCellList = shipParticularCells[i].cellList;

      for (let j = 0; j < shipParticularCellList.length; j++) {
        const range = sheet.range(
          shipParticularCellList[j].rowIndex - 1,
          shipParticularCellList[j].columnIndex - 1
        );
        range.enable(false);
      }
    }
  }

  checkInputs() {
    if ($("#nameInput").is(":enabled")) {
      const fileName = $("#nameInput").val();
      if (fileName === undefined || fileName === "") {
        window.alert("Name cannot be empty!");
        return false;
      }
    }

    if ($("#dateInput").is(":enabled")) {
      const date = $("#dateInput").val();
      if (date === undefined || date === "") {
        window.alert("Date cannot be empty!");
        return false;
      }
    }

    return true;
  }

  render() {
    const { templateNames, selectedTemplate, savedFileNames } = this.state;
    return (
      <div id="controlBox" style={{ width: "20%", height: 700, float: "left" }}>
        <select
          style={{ width: "100%", height: "35%", overflowX: "auto" }}
          multiple
          value={selectedTemplate}
          onChange={(e) => {
            this.setState({ selectedTemplate: e.target.value });
          }}
        >
          {templateNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={this.handleOpenTemplate}>Open Template</button>
        <label>BimarLogo:</label>
        <input type="checkbox" id="bimarLogoCheckbox" />

        <hr />

        <select
          id="savedFileNames"
          style={{ width: "100%", height: "35%", overflowX: "auto" }}
          multiple
        >
          {savedFileNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          id="selectSavedFile"
          onClick={() => {
            this.handleSelectSavedFile();
          }}
        >
          Open Saved File
        </button>
        <label>Readonly:</label>
        <input type="checkbox" id="readonlyCheckbox" />
        <button id="openInNewTabButton" onClick={() => {}}>
          Open In New Tab
        </button>
      </div>
    );
  }
}

export default LeftPane;
