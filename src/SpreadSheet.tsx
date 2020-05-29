import React, { Component } from "react";
import $ from "jquery";
import "@progress/kendo-ui/";

interface PropsType {
  children: JSX.Element;
}

class SpreadSheet extends Component<PropsType, {}> {
  spread: any;
  componentDidMount() {
    this.spread = $("#spreadsheet").kendoSpreadsheet();
  }

  render() {
    return <div id="spreadsheet"></div>;
  }
}

export default SpreadSheet;
