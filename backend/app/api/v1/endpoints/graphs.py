"""Graph management endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.models.graph import (
    Edge,
    Graph,
    GraphCreate,
    GraphResponse,
    Node,
    NodeData,
    NodePosition,
    NodeType,
)

router = APIRouter()

# In-memory storage for development (replace with Supabase in production)
_graphs_db: dict[UUID, Graph] = {}


@router.get("/", response_model=list[Graph])
async def list_graphs() -> list[Graph]:
    """
    List all graphs.

    Returns:
        List of all stored graphs.
    """
    return list(_graphs_db.values())


@router.post("/", response_model=GraphResponse, status_code=status.HTTP_201_CREATED)
async def create_graph(graph_data: GraphCreate) -> GraphResponse:
    """
    Create a new graph.

    Args:
        graph_data: Graph creation payload.

    Returns:
        Created graph with generated ID.
    """
    graph = Graph(
        name=graph_data.name,
        description=graph_data.description,
        source_type=graph_data.source_type,
        source_url=graph_data.source_url,
    )
    _graphs_db[graph.id] = graph

    return GraphResponse(
        success=True,
        message="Graph created successfully",
        data=graph,
    )


@router.get("/{graph_id}", response_model=GraphResponse)
async def get_graph(graph_id: UUID) -> GraphResponse:
    """
    Get a specific graph by ID.

    Args:
        graph_id: UUID of the graph to retrieve.

    Returns:
        The requested graph.

    Raises:
        HTTPException: If graph is not found.
    """
    graph = _graphs_db.get(graph_id)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph with ID {graph_id} not found",
        )

    return GraphResponse(
        success=True,
        message="Graph retrieved successfully",
        data=graph,
    )


@router.delete("/{graph_id}", response_model=GraphResponse)
async def delete_graph(graph_id: UUID) -> GraphResponse:
    """
    Delete a graph by ID.

    Args:
        graph_id: UUID of the graph to delete.

    Returns:
        Confirmation of deletion.

    Raises:
        HTTPException: If graph is not found.
    """
    graph = _graphs_db.pop(graph_id, None)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph with ID {graph_id} not found",
        )

    return GraphResponse(
        success=True,
        message="Graph deleted successfully",
        data=None,
    )


@router.post("/{graph_id}/nodes", response_model=GraphResponse)
async def add_node(graph_id: UUID, node: Node) -> GraphResponse:
    """
    Add a node to a graph.

    Args:
        graph_id: UUID of the graph.
        node: Node to add.

    Returns:
        Updated graph with new node.

    Raises:
        HTTPException: If graph is not found.
    """
    graph = _graphs_db.get(graph_id)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph with ID {graph_id} not found",
        )

    graph.nodes.append(node)

    return GraphResponse(
        success=True,
        message="Node added successfully",
        data=graph,
    )


@router.post("/{graph_id}/edges", response_model=GraphResponse)
async def add_edge(graph_id: UUID, edge: Edge) -> GraphResponse:
    """
    Add an edge to a graph.

    Args:
        graph_id: UUID of the graph.
        edge: Edge to add.

    Returns:
        Updated graph with new edge.

    Raises:
        HTTPException: If graph is not found.
    """
    graph = _graphs_db.get(graph_id)
    if not graph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph with ID {graph_id} not found",
        )

    # Validate that source and target nodes exist
    node_ids = {node.id for node in graph.nodes}
    if edge.source not in node_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source node {edge.source} not found in graph",
        )
    if edge.target not in node_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target node {edge.target} not found in graph",
        )

    graph.edges.append(edge)

    return GraphResponse(
        success=True,
        message="Edge added successfully",
        data=graph,
    )


@router.get("/{graph_id}/demo", response_model=GraphResponse)
async def get_demo_graph(graph_id: UUID) -> GraphResponse:
    """
    Generate a demo graph with sample nodes and edges.

    This endpoint creates a sample graph structure for testing
    the frontend visualization.

    Args:
        graph_id: UUID for the demo graph.

    Returns:
        Demo graph with sample data.
    """
    demo_graph = Graph(
        id=graph_id,
        name="Demo Conversation Timeline",
        description="A sample conversation graph for testing",
        source_type="youtube",
        nodes=[
            Node(
                id="node-1",
                type=NodeType.TOPIC,
                position=NodePosition(x=250, y=0),
                data=NodeData(
                    label="Introduction",
                    content="Opening remarks and topic overview",
                    timestamp_start=0.0,
                    timestamp_end=120.0,
                ),
            ),
            Node(
                id="node-2",
                type=NodeType.SUBTOPIC,
                position=NodePosition(x=100, y=150),
                data=NodeData(
                    label="Background Context",
                    content="Historical context and motivation",
                    timestamp_start=120.0,
                    timestamp_end=300.0,
                ),
            ),
            Node(
                id="node-3",
                type=NodeType.SUBTOPIC,
                position=NodePosition(x=400, y=150),
                data=NodeData(
                    label="Main Discussion",
                    content="Core topics and key points",
                    timestamp_start=300.0,
                    timestamp_end=600.0,
                ),
            ),
            Node(
                id="node-4",
                type=NodeType.QUESTION,
                position=NodePosition(x=250, y=300),
                data=NodeData(
                    label="Key Question",
                    content="What are the implications?",
                    timestamp_start=600.0,
                    timestamp_end=720.0,
                ),
            ),
            Node(
                id="node-5",
                type=NodeType.INSIGHT,
                position=NodePosition(x=250, y=450),
                data=NodeData(
                    label="Conclusion",
                    content="Summary and final thoughts",
                    timestamp_start=720.0,
                    timestamp_end=900.0,
                ),
            ),
        ],
        edges=[
            Edge(id="edge-1", source="node-1", target="node-2"),
            Edge(id="edge-2", source="node-1", target="node-3"),
            Edge(id="edge-3", source="node-2", target="node-4"),
            Edge(id="edge-4", source="node-3", target="node-4"),
            Edge(id="edge-5", source="node-4", target="node-5", animated=True),
        ],
    )

    return GraphResponse(
        success=True,
        message="Demo graph generated",
        data=demo_graph,
    )
