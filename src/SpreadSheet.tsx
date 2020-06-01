import React, { Component } from "react";
import "@progress/kendo-theme-default/dist/all.css";
import "@progress/kendo-ui/";
import $ from "@progress/kendo-ui/node_modules/jquery";

interface PropsType {
  children: JSX.Element;
}

class SpreadSheet extends Component<PropsType, {}> {
  componentDidMount() {
    $("#spreadsheet").kendoSpreadsheet();
  }

  render() {
    return <div id="spreadsheet"></div>;
  }
}

export default SpreadSheet;
