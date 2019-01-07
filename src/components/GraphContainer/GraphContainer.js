import React from "react";
import "./GraphContainer.css";
import cytoscape from "cytoscape";
import uniqid from "uniqid";
import { CyUtil } from "../../utils/CyUtil";
import Button from "../Button/Button";
import LiveData from "../LiveData/LiveData";
import Plotly from 'plotly.js-dist';

export default class GraphContainer extends React.Component {
  // cytoscape reference
  CY = null;

  nodesSleep = [];
  T = 50;

  state = {
    simulationStarted: false,
    diagnosticData: {
      atom: {
        clusteringCoefficient: 0,
        graphDensity: 0,
        averageDegree:0 ,
        totalDegree: 0,
      },
      plotData: null
    }
  };

  startSimulation = () => {
    this.setState({ simulationStarted: true });
    this.CY = cytoscape({
      container: document.getElementById("cy"),
      layout: {
        name: "cose",
        padding: 40,
        gravity: 0.5
      },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#F7B733"
          }
        },
        {
          selector: "edge",
          style: {
            width: 3,
            "line-color": "#FC4A1A"
          }
        }
      ]
    });

    setTimeout(() => {
      for (let t = 1; t < this.T; t++) {
        setTimeout(() => this.simulate(t), t * 2000);
      }
    }, 0);
  };

  simulate = t => {

    // Faza I

    // Ze spiacych wybieramy wybudzone node'y
    let nodesAwaken = this.nodesSleep.filter(n => n.wakeTime <= t);

    // Wybieramy martwe node'y
    let newNodesDead = nodesAwaken.filter(n => n.deathTime <= t);
    
    // Wyrzucamy martwe node'y z grafu
    newNodesDead.forEach(n => {
      n.links.forEach(el => {
        el.links = el.links.filter(item => item !== n);
      });
      this.CY.remove(this.CY.$("#" + n.id));
    });

    // Usuwamy martwe node'y ze spiących
    this.nodesSleep = this.nodesSleep.filter(n => !newNodesDead.includes(n));

    // Ze spiacych wybieramy node wybudzone node'y
    nodesAwaken = this.nodesSleep.filter(n => n.wakeTime <= t);
    
    nodesAwaken.forEach(n => {
      let linkNode = CyUtil.getRandomLink(n);
      // if(Math.floor(Math.random() * 20) === 1) linkNode = CyUtil.lookForManyLinksNode(this.nodesSleep);

      if (linkNode !== n && linkNode !== undefined) {
        n.links.push(linkNode);
        linkNode.links.push(n);
        this.CY.add({
          group: "edges",
          data: { source: n.id, target: linkNode.id }
        });
      }

      n.wakeTime = CyUtil.sleeptime() + t;
    });

    // Faza II

    // Tworzymy nowe node'y
    let nodes = Array.apply(null, Array(CyUtil.N(t))).map(() => ({
      id: uniqid()
    }));

    // Dodajemy je do grafu
    this.CY.add(nodes.map(el => ({ group: "nodes", data: { id: el.id } })));

    // Dla kazdego z nowych node'ów wybieramy sąsiada
    nodes.forEach(n => {
      if (this.nodesSleep.length === 0) {
        //w pierwszej iteracji nie wybieram polaczen
        n.links = [];
      } else {
        // console.log(t);
        // console.log(this.nodesSleep);
        let linkNode = CyUtil.lookForManyLinksNode(this.nodesSleep);
        // console.log(linkNode);
        n.links = [linkNode];
        linkNode.links.push(n); //linki w dwie strony
        this.CY.add({
          group: "edges",
          data: { source: n.id, target: linkNode.id }
        });
      }

      // Wyliczamy czas zycia nowych node'ów
      n.deathTime = CyUtil.lifetime() + t;

      // Wyliczamy czas snu node'ów
      n.wakeTime = CyUtil.sleeptime() + t;
    });

    // Dodajemy nowe node'y do spiących
    this.nodesSleep = this.nodesSleep.concat(nodes);

    this.CY.layout({
      name: "cose",
      animate: false,
      componentSpacing: 15
    }).run();

    // console.log(this.CY.nodes());
    this.setState({
      diagnosticData: {
        atom: {
          clusteringCoefficient: CyUtil.calculateAverageClustering(t, this.nodesSleep),
          graphDensity: this.CY.edges().length / this.CY.nodes().length,
          averageDegree: this.CY.nodes().totalDegree(true) / this.CY.nodes().length,
          totalDegree: this.CY.nodes().totalDegree(true),
        },
        plotData: CyUtil.nodesEdgesNumberPlotData(this.nodesSleep)
      }
    });

    Plotly.newPlot('plot', [this.state.diagnosticData.plotData]);
  };

  render() {
    const { simulationStarted } = this.state;
    return (
      <>
        <div className={"GraphContainer"} id="cy" />
        {simulationStarted ? (
          <LiveData diagnosticData={this.state.diagnosticData.atom} />
        ) : null}
        {simulationStarted ? null : (
          <Button onClick={this.startSimulation} text={"START"} />
        )}
      </>
    );
  }
}
