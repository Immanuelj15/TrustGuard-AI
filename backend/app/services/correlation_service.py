from typing import Dict, List, Any, Set
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models import IOC, Evidence, Case, AnalysisJob

def get_case_correlations(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Identifies shared IOCs across multiple evidence items in a case.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {"shared_iocs": [], "correlation_pairs": [], "disclaimer": ""}

    iocs = db.query(IOC).filter(IOC.case_id == case_id).all()
    evidence_items = {e.id: e for e in db.query(Evidence).filter(Evidence.case_id == case_id).all()}

    # Group IOCs by normalized key -> list of evidence_ids
    ioc_map: Dict[str, Dict[str, Any]] = {}
    for i in iocs:
        key = f"{i.ioc_type}:{i.normalized_value}"
        if key not in ioc_map:
            ioc_map[key] = {
                "ioc_type": i.ioc_type,
                "value": i.value,
                "normalized_value": i.normalized_value,
                "evidence_ids": set(),
                "sample_context": i.context_snippet
            }
        ioc_map[key]["evidence_ids"].add(i.evidence_id)

    # Filter to only shared IOCs (present in >= 2 evidence items)
    shared_iocs = []
    # Pairwise correlations: (ev1, ev2) -> list of shared IOCs
    pair_map: Dict[tuple, List[Dict[str, str]]] = defaultdict(list)

    for key, data in ioc_map.items():
        ev_list = sorted(list(data["evidence_ids"]))
        if len(ev_list) >= 2:
            shared_iocs.append({
                "ioc_type": data["ioc_type"],
                "value": data["value"],
                "normalized_value": data["normalized_value"],
                "evidence_count": len(ev_list),
                "evidence_items": [
                    {
                        "id": eid,
                        "filename": evidence_items[eid].original_filename if eid in evidence_items else "Unknown"
                    }
                    for eid in ev_list
                ],
                "sample_context": data["sample_context"]
            })
            # Populate pairwise relations
            for i in range(len(ev_list)):
                for j in range(i + 1, len(ev_list)):
                    pair = (ev_list[i], ev_list[j])
                    pair_map[pair].append({
                        "ioc_type": data["ioc_type"],
                        "value": data["value"]
                    })

    correlation_pairs = []
    for (ev1, ev2), items in pair_map.items():
        correlation_pairs.append({
            "source_evidence_id": ev1,
            "source_filename": evidence_items[ev1].original_filename if ev1 in evidence_items else "Unknown",
            "target_evidence_id": ev2,
            "target_filename": evidence_items[ev2].original_filename if ev2 in evidence_items else "Unknown",
            "shared_ioc_count": len(items),
            "shared_iocs": items
        })

    return {
        "case_id": case_id,
        "total_unique_iocs": len(ioc_map),
        "shared_iocs_count": len(shared_iocs),
        "shared_iocs": shared_iocs,
        "correlation_pairs": correlation_pairs,
        "disclaimer": "Shared indicators demonstrate infrastructure and communication overlap. They do not independently prove common authorship or criminal conspiracy without independent corroboration."
    }

def build_correlation_graph(db: Session, case_id: str) -> Dict[str, Any]:
    """
    Constructs a graph structure (Nodes & Edges) for interactive visualization.
    """
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        return {"nodes": [], "edges": []}

    evidence_list = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    iocs = db.query(IOC).filter(IOC.case_id == case_id).all()

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    # 1. Case Node (Center)
    nodes.append({
        "id": case.id,
        "label": case.case_number,
        "title": case.title,
        "type": "case",
        "category": case.complaint_category,
        "priority": case.priority
    })

    # 2. Evidence Nodes
    evidence_ids = set()
    for ev in evidence_list:
        evidence_ids.add(ev.id)
        nodes.append({
            "id": ev.id,
            "label": ev.original_filename[:24] + "..." if len(ev.original_filename) > 24 else ev.original_filename,
            "full_name": ev.original_filename,
            "type": "evidence",
            "evidence_type": ev.evidence_type,
            "sha256": ev.sha256_hash[:12] + "..."
        })
        # Edge from Case to Evidence
        edges.append({
            "id": f"e:{case.id}-{ev.id}",
            "source": case.id,
            "target": ev.id,
            "relation": "CONTAINS"
        })

    # 3. IOC Nodes & Edges
    ioc_node_map: Dict[str, str] = {} # key -> node_id
    for ioc in iocs:
        key = f"{ioc.ioc_type}:{ioc.normalized_value}"
        if key not in ioc_node_map:
            ioc_node_id = f"ioc:{key}"
            ioc_node_map[key] = ioc_node_id
            nodes.append({
                "id": ioc_node_id,
                "label": ioc.value[:22] + "..." if len(ioc.value) > 22 else ioc.value,
                "value": ioc.value,
                "type": ioc.ioc_type,
                "ioc_type": ioc.ioc_type
            })

        # Edge from Evidence to IOC
        edges.append({
            "id": f"e:{ioc.evidence_id}-{ioc_node_map[key]}",
            "source": ioc.evidence_id,
            "target": ioc_node_map[key],
            "relation": "MENTIONS"
        })

    return {
        "case_id": case_id,
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "case_nodes": 1,
            "evidence_nodes": len(evidence_list),
            "ioc_nodes": len(ioc_node_map),
            "total_edges": len(edges)
        }
    }
